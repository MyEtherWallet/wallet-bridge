import IO from 'socket.io'
import CONFIG from './config'
import {
  Trezor,
  Ledger,
  Keepkey,
  Bitbox,
  WalletInterface
} from './wallets/index'
import Events from './events'

const trezor = new Trezor()
const ledger = new Ledger()
const keepkey = new Keepkey()
const bitbox = new Bitbox()

const initWallets = async () => {
  await trezor.init()
  await ledger.init()
  await keepkey.init()
  await bitbox.init()
}
setInterval(() => {
  console.log('LEDGER DEVICE', ledger.isAvailable())
  console.log('TREZOR DEVICE', trezor.isAvailable())
  console.log('KEEPKEY DEVICE', keepkey.isAvailable())
  console.log('BITBOX DEVICE', bitbox.isAvailable())
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
        case bitbox.identifier:
          client.device = new WalletInterface(client, bitbox)
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
