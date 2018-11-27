import Events from '../events'
class WalletInterface {
  constructor(client, wallet) {
    this.wallet = wallet
    this.client = client
    this.walletIdentifier = wallet.identifier
    this.client.removeAllListeners(Events.GET_PUBKEY)
    this.client.removeAllListeners(Events.SIGN_MESSAGE)
    this.client.removeAllListeners(Events.SIGN_TRANSACTION)
    this.client.on(Events.GET_PUBKEY, this.getPublicKey.bind(this))
    this.client.on(Events.SIGN_MESSAGE, this.signMessage.bind(this))
    this.client.on(Events.SIGN_TRANSACTION, this.signTransaction.bind(this))
    this.client.on(Events.IS_AVAILABLE, this.isAvailable.bind(this))
  }
  setWalletSpecificFunctions() {
    if (this.walletIdentifier == 'trezor' || this.walletIdentifier == 'keepkey')
      this.wallet.setClient(this.client)
  }
  getPublicKey(path, cb) {
    this.setWalletSpecificFunctions()
    this.wallet
      .getPublicKey(path)
      .then(pubkey => {
        cb(null, pubkey)
      })
      .catch(err => {
        cb(err.message)
      })
  }
  signTransaction(path, txRLP, cb) {
    this.setWalletSpecificFunctions()
    this.wallet
      .signTransaction(path, txRLP)
      .then(signedTx => {
        cb(null, signedTx)
      })
      .catch(err => {
        cb(err.message)
      })
  }
  signMessage(path, msgHex, cb) {
    this.setWalletSpecificFunctions()
    this.wallet
      .signMessage(path, msgHex)
      .then(sig => {
        cb(null, sig)
      })
      .catch(err => {
        cb(err.message)
      })
  }
  isAvailable(cb) {
    this.wallet
      .isAvailable()
      .then(res => {
        cb(null, res)
      })
      .catch(err => {
        cb(err.message)
      })
  }
  disconnect() {
    this.wallet.disconnect()
  }
}
export default WalletInterface
