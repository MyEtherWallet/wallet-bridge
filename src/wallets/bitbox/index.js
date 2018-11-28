import BitboxEvents from './events'
import { getDeviceInfo } from './utils'
import BitBoxComm from './bitbox'
import { sanitizeHex, stripHexPrefix, getBufferFromHex } from '../utils'
import * as HDKey from 'hdkey'
import ethTx from 'ethereumjs-tx'
import ethUtil from 'ethereumjs-util'
class Bitbox {
  constructor() {
    this.identifier = 'bitbox'
    this.deviceSession = null
  }
  init() {
    setInterval(() => {
      const device = getDeviceInfo()
      if (!this.deviceSession && device) {
        this.deviceSession = new BitBoxComm(device)
      } else if (!device) this.deviceSession = null
    }, 500)
  }
  setClient(client) {
    this.client = client
  }
  setPassword() {
    return new Promise((resolve, reject) => {
      if (this.deviceSession && !this.deviceSession.secret) {
        this.client.emit(BitboxEvents.BITBOX_PASSWORD, (err, password) => {
          if (!err) resolve(this.deviceSession.setCommunicationSecret(password))
          else reject(err)
        })
      } else resolve()
    })
  }
  getPublicKey(path) {
    return new Promise((resolve, reject) => {
      this.setPassword()
        .then(() => {
          this.deviceSession
            .sendEncrypted('{ "xpub" : "' + path + '" }')
            .then(response => {
              const hdkey = HDKey.fromExtendedKey(response.xpub)
              resolve({
                publicKey: hdkey.publicKey.toString('hex'),
                chainCode: hdkey.chainCode.toString('hex')
              })
            })
        })
        .catch(reject)
    })
  }
  signTransaction(path, txRLP) {
    const tx = new ethTx(txRLP)
    const hashToSign = tx.hash(false).toString('hex')
    return new Promise((resolve, reject) => {
      this.setPassword()
        .then(() => {
          this.deviceSession
            .sendEncrypted(
              '{"sign":{"data":[{"hash":"' +
                hashToSign +
                '","keypath":"' +
                path +
                '"}]}}'
            )
            .then(() => {
              this.client.emit(BitboxEvents.BITBOX_ACTION)
              this.deviceSession.sendEncrypted('{"sign":""}').then(response => {
                if (response.error) reject(response.error)
                else {
                  tx.v = Buffer.from([
                    parseInt(response.sign[0].recid, 16) +
                      27 +
                      tx.getChainId() * 2 +
                      8
                  ])
                  tx.r = getBufferFromHex(response.sign[0].sig.slice(0, 64))
                  tx.s = getBufferFromHex(response.sign[0].sig.slice(64, 128))
                  resolve(tx.serialize().toString('hex'))
                }
              })
            })
        })
        .catch(reject)
    })
  }
  signMessage(path, hexMsg) {
    const msgHash = ethUtil
      .hashPersonalMessage(ethUtil.toBuffer(hexMsg))
      .toString('hex')
    return new Promise((resolve, reject) => {
      this.setPassword()
        .then(() => {
          this.deviceSession
            .sendEncrypted(
              '{"sign":{"data":[{"hash":"' +
                msgHash +
                '","keypath":"' +
                path +
                '"}]}}'
            )
            .then(() => {
              this.client.emit(BitboxEvents.BITBOX_ACTION)
              this.deviceSession.sendEncrypted('{"sign":""}').then(response => {
                if (response.error) reject(response.error)
                else
                  resolve(
                    response.sign[0].sig +
                      Buffer.from([
                        parseInt(response.sign[0].recid, 16) + 27
                      ]).toString('hex')
                  )
              })
            })
        })
        .catch(reject)
    })
  }
  async isAvailable() {
    return this.deviceSession != null
  }
  disconnect() {}
}
export default Bitbox
