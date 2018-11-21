import IO from 'socket.io'
import CONFIG from './config'
import { Trezor } from './wallets/index'
import Events from './events'

const io = IO.listen(CONFIG.PORT)
io.origins(CONFIG.ORIGINS)
io.on('connect', function(client) {
  client.on('disconnect', reason => {
    if (client.device) client.device.disconnect()
  })
  client.on(Events.DEVICE_CONNECT, (device, cb) => {
    switch (device) {
      case Trezor.id:
        client.device = new Trezor.instance(client)
        cb(false, true)
        break
      default:
        cb('requested device not found')
    }
  })
})
