import { DeviceList } from 'trezor.js'
import TrezorEvents from './events'
import { parseHDPath } from './utils'
import { sanitizeHex, stripHexPrefix, getBufferFromHex } from '../utils'
import ethTx from 'ethereumjs-tx'
class Trezor {
  constructor() {
    this.identifier = 'trezor'
    this.deviceSession = null
  }
  init() {
    const deviceList = new DeviceList({ debug: false })
    const onDevice = device => {
      if (!device.isBootloader()) {
        device.on('button', code => {
          this.client.emit(
            TrezorEvents.TREZOR_ACTION,
            device.features.label,
            code
          )
        })
        device.on('passphrase', cb => {
          this.client.emit(TrezorEvents.TREZOR_PASSWORD, (err, password) => {
            cb(err, password)
          })
        })
        device.on('pin', (_, cb) => {
          this.client.emit(TrezorEvents.TREZOR_PIN, (err, pin) => {
            cb(err, pin)
          })
        })
        device.on('disconnect', () => {
          this.deviceSession = null
          if (deviceList.hasDeviceOrUnacquiredDevice()) {
            deviceList
              .acquireFirstDevice(true)
              .then(({ device: _device, session }) => {
                this.deviceSession = session
              })
          }
        })
        deviceList.acquireFirstDevice(true).then(({ session }) => {
          if (!this.deviceSession) this.deviceSession = session
        })
      }
    }
    deviceList.on('connectUnacquired', device => device.steal())
    deviceList.on('connect', onDevice)
  }
  setClient(client) {
    this.client = client
  }
  getPublicKey(path) {
    return new Promise((resolve, reject) => {
      this.deviceSession
        .getPublicKey(parseHDPath(path))
        .then(payload => {
          resolve({
            chainCode: payload.message.node.chain_code,
            publicKey: payload.message.node.public_key
          })
        })
        .catch(reject)
    })
  }
  signTransaction(path, txRLP) {
    return new Promise((resolve, reject) => {
      const tx = new ethTx(txRLP)
      this.deviceSession
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
          resolve(tx.serialize().toString('hex'))
        })
        .catch(reject)
    })
  }
  signMessage(path, hexMsg) {
    return new Promise((resolve, reject) => {
      this.deviceSession
        .signEthMessage(parseHDPath(path), stripHexPrefix(sanitizeHex(hexMsg)))
        .then(response => {
          resolve(response.message.signature)
        })
        .catch(reject)
    })
  }
  async isAvailable() {
    return this.deviceSession != null
  }
  disconnect() {}
}
export default Trezor
