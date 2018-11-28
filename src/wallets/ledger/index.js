import Transport from '@ledgerhq/hw-transport-node-hid'
import AppEth from '@ledgerhq/hw-app-eth'
import ethTx from 'ethereumjs-tx'
import { getBufferFromHex, stripHexPrefix, sanitizeHex } from '../utils'
class Ledger {
  constructor() {
    this.identifier = 'ledger'
  }
  async init() {
    this.interval = setInterval(async () => {
      const _devices = await Transport.list()
      if (_devices.length) {
        this.transport = await Transport.create(2000)
        this.ledger = new AppEth(this.transport)
      } else {
        this.transport = null
        this.ledger = null
      }
    }, 2000)
  }
  async disconnect() {
    clearInterval(this.interval)
  }
  async isAvailable() {
    return this.ledger != null
  }
  async getPublicKey(path) {
    const pubObj = await this.ledger.getAddress(path, false, true)
    return {
      publicKey: pubObj.publicKey,
      chainCode: pubObj.chainCode
    }
  }
  async signTransaction(path, txRLP) {
    const tx = new ethTx(txRLP)
    const networkId = tx._chainId
    tx.raw[6] = Buffer.from([networkId])
    tx.raw[7] = Buffer.from([])
    tx.raw[8] = Buffer.from([])
    const result = await this.ledger.signTransaction(
      path,
      tx.serialize().toString('hex')
    )
    tx.v = getBufferFromHex(result.v)
    tx.r = getBufferFromHex(result.r)
    tx.s = getBufferFromHex(result.s)
    return tx.serialize().toString('hex')
  }
  async signMessage(path, msgHex) {
    const result = await this.ledger.signPersonalMessage(
      path,
      stripHexPrefix(msgHex)
    )
    const v = parseInt(result.v, 10) - 27
    const vHex = sanitizeHex(v.toString(16))
    return Buffer.concat([
      getBufferFromHex(result.r),
      getBufferFromHex(result.s),
      getBufferFromHex(vHex)
    ]).toString('hex')
  }
}
export default Ledger
