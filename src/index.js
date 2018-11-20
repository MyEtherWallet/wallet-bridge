import IO from 'socket.io'
import CONFIG from './config'
import { Trezor } from './wallets/index'
import Events from './events'

const io = IO.listen(CONFIG.PORT)
// io.origins(CONFIG.ORIGINS)
io.on('connection', function(client) {
  client.on(Events.DEVICE_CONNECT, (device, cb) => {
    console.log('test')
    switch (device) {
      case Trezor.id:
        client.device = new Trezor.class(client)
        cb(false, true)
        break
      default:
        cb('requested device not found')
    }
  })
})
