import SecalotEthApi from 'secalot-eth-api'
import SecalotEvents from './events'
import ethTx from 'ethereumjs-tx'
import { splitPath } from './utils'
import { stripHexPrefix } from '../utils'
class Secalot {
  constructor() {
    this.identifier = 'secalot'
  }
  async init() {
    this.interval = setInterval(async () => {
      const _devices = SecalotEthApi.getConnectedDevices()
      if (_devices.length) {
        this.secalot = new SecalotEthApi(_devices[0])
      } else {
        this.secalot = null
      }
    }, 2000)
  }
  async disconnect() {
    clearInterval(this.interval)
  }
  async isAvailable() {
    return this.secalot != null
  }
  setClient(client) {
    this.client = client
  }

  sendConfirmationNotification() {
    this.client.emit(SecalotEvents.SECALOT_CONFIRM)
  }
  async getPin() {
    return new Promise((resolve, reject) => {
      this.client.emit(SecalotEvents.SECALOT_PIN, (err, pin) => {
        if (!err) resolve(pin)
        else reject(err)
      })
    })
  }
  async verifyPin() {
    const info = await this.secalot.getInfo()

    if (info.pinVerified === false) {
      const pin = await this.getPin()
      await this.secalot.verifyPin(pin)
    }
  }

  async getPublicKey(path) {
    const derivationIndexes = splitPath(path)
    await this.verifyPin()
    const pubObj = await this.secalot.getPublicKey(derivationIndexes)
    return {
      publicKey: pubObj.publicKey,
      chainCode: pubObj.chainCode
    }
  }
  async signTransaction(path, txRLP) {
    const tx = new ethTx(txRLP)
    const networkId = tx._chainId
    const derivationIndexes = splitPath(path)
    tx.raw[6] = Buffer.from([networkId])
    tx.raw[7] = Buffer.from([])
    tx.raw[8] = Buffer.from([])
    await this.verifyPin()
    this.sendConfirmationNotification()
    const result = await this.secalot.signData(
      tx.serialize().toString('hex'),
      derivationIndexes,
      'transaction'
    )
    tx.v = Buffer.from(result.substring(0, 2), 'hex')
    tx.v[0] += 27
    if (tx._chainId > 0) {
      tx.v[0] += tx._chainId * 2 + 8
    }
    tx.r = Buffer.from(result.substring(2, 2 + 64), 'hex')
    tx.s = Buffer.from(result.substring(2 + 64, 2 + 64 + 64), 'hex')
    return tx.serialize().toString('hex')
  }
  async signMessage(path, msgHex) {
    const derivationIndexes = splitPath(path)
    msgHex = stripHexPrefix(msgHex)
    var header =
      '\x19Ethereum Signed Message:\n' + (msgHex.length / 2).toString()
    msgHex = Buffer.from(header, 'utf8').toString('hex') + msgHex
    await this.verifyPin()
    this.sendConfirmationNotification()
    const result = await this.secalot.signData(
      msgHex,
      derivationIndexes,
      'message'
    )
    const v = Buffer.from(result.substring(0, 2), 'hex')
    v[0] += 27
    const r = Buffer.from(result.substring(2, 2 + 64), 'hex')
    const s = Buffer.from(result.substring(2 + 64, 2 + 64 + 64), 'hex')
    return Buffer.concat([r, s, v]).toString('hex')
  }
}
export default Secalot
