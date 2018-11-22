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
        '05110d298e04fe1fa17887f9c56286eb21d1f28d8537e5f45541070945b63bea' ===
          result.chainCode
      )
      assert(
        '03050872e2b0698a05458e8b2ae8da72c6ef072017f431fb3eac5dac92be7e0fb1' ===
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
            '0x5323419cc3e9c8b6b15067ec44ec8d74de86437f7d6a005326a05a63e0d0ccc2475f6f5b75dfaf822740cf49b33ad0bda7aaa77213b6064c16177168d882ae841c' ===
              '0x' + result
          )
        }
      }
    )
  })
}

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
socket.on(TrezorEvents.TREZOR_ACTION, console.log)
socket.on('error', (err, res) => {
  console.log('ERROR', err, res)
})
