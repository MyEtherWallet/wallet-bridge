import assert from 'assert'
import io from 'socket.io-client'
import Events from '../src/events'
import TrezorEvents from '../src/wallets/trezor/events'
const socket = io('ws://localhost:6577')
const timeoutPromiseFn = t =>
  new Promise(resolve => {
    setTimeout(() => resolve(), t)
  })
socket.on('connect', () => {
  socket.emit(Events.DEVICE_CONNECT, 'ledger', (err, res) => {
    console.log(err, res)
    if (!err) {
      const checkAvaialble = () => {
        return new Promise((resolve, reject) => {
          socket.emit(Events.IS_AVAILABLE, (err, res) => {
            console.log('isAvailable', err, res)
            if (err) return reject(err)
            if (!res) return timeoutPromiseFn(1000).then(() => checkAvaialble())
            else {
              runner()
            }
          })
        })
      }
      checkAvaialble()
    }
  })
})
const runner = () => {
  socket.emit(Events.GET_PUBKEY, "m/44'/60'/0'/0", (err, result) => {
    console.log('pubkey', err, result)
    if (!err) {
      assert(
        '511e49abcba88b9a09cd46b4fd37ebf57a1a3b4fb49919c58f49b0b43b27cccc' ===
          result.chainCode
      )
      assert(
        '04ad4206e60b65507fa7718da3d04d0eb1076418013fede6c441925afd67e0f1df329676ec63c5cf8d9a6f91e9bd6c5aaca0895aed9c8c8ec47e27c098f7698312' ===
          result.publicKey
      )
    }
    socket.emit(
      Events.SIGN_MESSAGE,
      "m/44'/60'/0'/0/0",
      '0x68656c6c6f', //hello
      (err, result) => {
        console.log('msgSign', err, result)
        if (!err) {
          assert(
            '0x8252bcf4186f6215a7240b251911d861b950d7ad25665a855fa29ca2ccd088ca5d48459f8c4b668e86a69b00f400d7ecffbd9aeaef3876a5dbbe4fafb9295ee201' ===
              '0x' + result
          )
        }
      }
    )
  })
}
socket.on('error', (err, res) => {
  console.log('ERROR', err, res)
})
