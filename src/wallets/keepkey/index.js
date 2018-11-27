import DeviceList from './device-list'
import KeepKeyEvents from './events'
import { DeviceMessageHelper } from "@keepkey/device-client/dist/device-message-helper";
import { NodeVector } from "@keepkey/device-client/dist/node-vector";
import { isDeviceConnected } from './utils'
import { sanitizeHex, stripHexPrefix, getBufferFromHex } from '../utils'
import ethTx from 'ethereumjs-tx'
class KeepKey {
  constructor() {
    this.identifier = 'keepkey'
    this.deviceSession = null
  }
  init() {
    const deviceList = new DeviceList(2000)
    const onDevice = device => {
      device.on('ButtonRequest', () => {
        this.client.emit(KeepKeyEvents.KEEPKEY_ACTION)
      })
      device.on('PassphraseRequest', () => {
        this.client.emit(KeepKeyEvents.KEEPKEY_PASSWORD, (err, password) => {
          if (!err) device.PassphraseAck(password)
          else device.PassphraseAck('')
        })
      })
      device.on('PinMatrixRequest', () => {
        this.client.emit(KeepKeyEvents.KEEPKEY_PIN, (err, pin) => {
          if (!err) device.pinMatrixAck({ pin: pin })
          else device.PinMatrixAck('')
        })
      })
      deviceList.acquireFirstDevice().then(session => {
        if (!this.deviceSession) this.deviceSession = session
      })
    }
    deviceList.on('connect', onDevice)
    deviceList.on('disconnect', () => {
      deviceList.acquireFirstDevice().then(session => {
        this.deviceSession = session
      })
    })
  }
  setClient(client) {
    this.client = client
  }
  getPublicKey(path) {
    return new Promise((resolve, reject) => {
      this.deviceSession
        .getPublicKey(path, false)
        .then(payload => {
          resolve({
            chainCode: payload.node.chain_code.toString('hex'),
            publicKey: payload.node.public_key.toString('hex')
          })
        })
        .catch(reject)
    })
  }
  signTransaction(path, txRLP) {
    return new Promise((resolve, reject) => {
      const tx = new ethTx(txRLP)
      var message = DeviceMessageHelper.factory("EthereumSignTx");
      message.setAddressN(NodeVector.fromString(path).toArray());
      message.setNonce(tx.nonce)
      message.setGasLimit(tx.gasLimit)
      message.setGasPrice(tx.gasPrice)
      message.setTo(tx.to)
      message.setValue(tx.value)
      message.setDataInitialChunk(tx.data)
      message.setChainId(tx.getChainId())
      message.setDataLength(tx.data.length)
      this.deviceSession.writeToDevice(message).then(sig => {
        tx.v = getBufferFromHex(sig.signature_v.toString(16))
        tx.r = getBufferFromHex(sig.signature_r.toString('hex'))
        tx.s = getBufferFromHex(sig.signature_s.toString('hex'))
        resolve(tx.serialize().toString('hex'))
      }).catch(reject)
    })
  }
  signMessage(path, hexMsg) {
    return new Promise((resolve, reject) => {
      var message = DeviceMessageHelper.factory("EthereumSignMessage");
      message.setAddressN(NodeVector.fromString(path).toArray());
      message.setMessage(getBufferFromHex(stripHexPrefix(sanitizeHex(hexMsg))));
      this.deviceSession.writeToDevice(message).then(response => {
            resolve(response.signature.toString('hex'))
          }).catch(reject)
    })
  }
  async isAvailable() {
    return this.deviceSession != null
  }
  disconnect() {}
}
export default KeepKey
