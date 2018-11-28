import IO from 'socket.io'
import CONFIG from './config'
import { Trezor, Ledger, Keepkey, WalletInterface } from './wallets/index'
import Events from './events'
// var log = console.error
// console.error = function() {
//   // log.apply(console, arguments)
//   // // Print the stack trace
//   // console.trace()
// }

const trezor = new Trezor()
const ledger = new Ledger()
const keepkey = new Keepkey()

const initWallets = async () => {
  await trezor.init()
  await ledger.init()
  await keepkey.init()
}
setInterval(() => {
  console.log('LEDGER DEVICE', ledger.isAvailable())
  console.log('TREZOR DEVICE', trezor.isAvailable())
  console.log('KEEPKEY DEVICE', keepkey.isAvailable())
}, 1000)
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
        case keepkey.identifier:
          client.device = new WalletInterface(client, keepkey)
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
