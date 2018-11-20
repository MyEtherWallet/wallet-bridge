import io from 'socket.io-client'
import Events from '../src/events'
import TrezorEvents from '../src/wallets/trezor/events'
const socket = io('ws://localhost:6577')
socket.on('connect', () => {
  socket.emit(Events.DEVICE_CONNECT, 'trezor', (err, res) => {
    console.log(err, res)
  })
})
socket.on(TrezorEvents.TREZOR_CONNECT, () => {
  socket.emit(TrezorEvents.TREZOR_PUBKEY, "m/44'/60'/0'/0", console.log)
})
socket.on(TrezorEvents.TREZOR_PIN, cb => {
  console.log('Please enter PIN. The positions:')
  console.log('7 8 9')
  console.log('4 5 6')
  console.log('1 2 3')
  process.stdin.resume()
  process.stdin.on('data', buffer => {
    var text = buffer.toString().replace(/\n$/, '')
    process.stdin.pause()
    cb(null, text)
  })
})
socket.on(TrezorEvents.TREZOR_PASSWORD, console.log)
socket.on(TrezorEvents.TREZOR_DISCONNECT, console.log)
socket.on('error', console.log)
