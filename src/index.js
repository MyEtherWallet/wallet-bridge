import IO from 'socket.io'
import CONFIG from './config'
import { Trezor, Ledger, WalletInterface } from './wallets/index'
import Events from './events'

const trezor = new Trezor()
const ledger = new Ledger()

const initWallets = async () => {
  await trezor.init()
  await ledger.init()
}
const io = IO.listen(CONFIG.PORT)
io.origins(CONFIG.ORIGINS)
initWallets().then(() => {
  io.on('connect', function(client) {
    client.on('disconnect', reason => {
      if (client.device) client.device.disconnect()
    })
    client.on(Events.DEVICE_CONNECT, (device, cb) => {
      switch (device) {
        case trezor.identifier:
          client.device = new WalletInterface(client, trezor)
          cb(false, true)
          break
        case ledger.identifier:
          client.device = new WalletInterface(client, ledger)
          cb(false, true)
          break
        default:
          cb('requested device not found')
      }
    })
  })
})
