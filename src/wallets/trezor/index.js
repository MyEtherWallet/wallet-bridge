import { DeviceList } from 'trezor.js'
import Events from '../../events'
import TrezorEvents from './events'
import {
  parseHDPath,
  sanitizeHex,
  stripHexPrefix,
  getBufferFromHex
} from './utils'
import ethTx from 'ethereumjs-tx'
class Trezor {
  constructor(client) {
    this.client = client
    const deviceList = new DeviceList({ debug: false })
    const onDevice = device => {
      client.emit(
        TrezorEvents.TREZOR_CONNECT,
        device.features.label,
        device.isBootloader()
      )
      if (!device.isBootloader()) {
        device.on('button', code => {
          client.emit(Events.DEVICE_ACTION, device.features.label, code)
        })
        device.on('passphrase', cb => {
          client.emit(TrezorEvents.TREZOR_PASSWORD, (err, password) => {
            cb(err, password)
          })
        })
        device.on('pin', (_, cb) => {
          client.emit(TrezorEvents.TREZOR_PIN, (err, pin) => {
            cb(err, pin)
          })
        })
        device.on('disconnect', () => {
          client.emit(TrezorEvents.TREZOR_DISCONNECT, device.features.label)
        })
      } else {
        client.emit(
          Events.WARNING,
          'Device is in bootloader mode, re-connected it'
        )
      }
    }
    deviceList.on('connectUnacquired', device => device.steal())
    deviceList.on('connect', onDevice)
    this.client.on(TrezorEvents.TREZOR_PUBKEY, (path, cb) => {
      this.getPublicKey(deviceList, path, cb)
    })
    this.client.on(TrezorEvents.TREZOR_SIGN_TX, (path, txRLP, cb) => {
      this.signTransaction(deviceList, path, txRLP, cb)
    })
    this.client.on(TrezorEvents.TREZOR_SIGN_MSG, (path, msgHex, cb) => {
      this.signMessage(deviceList, path, msgHex, cb)
    })
  }
  getPublicKey(deviceList, path, cb) {
    deviceList
      .acquireFirstDevice(true)
      .then(({ session }) => {
        session.getPublicKey(parseHDPath(path)).then(payload => {
          cb(null, {
            chainCode: payload.message.node.chain_code,
            publicKey: payload.message.node.public_key
          })
        })
      })
      .catch(err => {
        cb(err.message)
      })
  }
  signTransaction(deviceList, path, txRLP, cb) {
    const tx = new ethTx(txRLP)
    deviceList
      .acquireFirstDevice(true)
      .then(({ session }) => {
        session
          .signEthTx(
            parseHDPath(path),
            stripHexPrefix(sanitizeHex(tx.nonce.toString('hex'))),
            stripHexPrefix(sanitizeHex(tx.gasPrice.toString('hex'))),
            stripHexPrefix(sanitizeHex(tx.gasLimit.toString('hex'))),
            stripHexPrefix(sanitizeHex(tx.to.toString('hex'))),
            stripHexPrefix(sanitizeHex(tx.value.toString('hex'))),
            stripHexPrefix(sanitizeHex(tx.data.toString('hex'))),
            tx.getChainId()
          )
          .then(sig => {
            tx.v = getBufferFromHex(sig.v.toString(16))
            tx.r = getBufferFromHex(sig.r)
            tx.s = getBufferFromHex(sig.s)
            cb(null, tx.serialize().toString('hex'))
          })
      })
      .catch(err => {
        cb(err.message)
      })
  }
  signMessage(deviceList, path, hexMsg, cb) {
    deviceList
      .acquireFirstDevice(true)
      .then(({ session }) => {
        session
          .signEthMessage(
            parseHDPath(path),
            stripHexPrefix(sanitizeHex(hexMsg))
          )
          .then(response => {
            cb(null, response.signature)
          })
      })
      .catch(err => {
        cb(err.message)
      })
  }
  disconnect() {}
}
export default {
  id: 'trezor',
  instance: Trezor
}
