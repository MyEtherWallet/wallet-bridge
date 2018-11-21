import { DeviceList } from 'trezor.js'
import Events from '../../events'
import TrezorEvents from './events'
import { parseHDPath } from './utils'
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
  disconnect() {}
}
export default {
  id: 'trezor',
  instance: Trezor
}
