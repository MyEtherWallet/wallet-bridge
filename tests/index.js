import assert from 'assert'
import io from 'socket.io-client'
import Events from '../src/events'
import BitboxEvents from '../src/wallets/bitbox/events'
const socket = io('ws://localhost:6577')
const timeoutPromiseFn = t =>
  new Promise(resolve => {
    setTimeout(() => resolve(), t)
  })
socket.on('connect', () => {
  socket.emit(Events.DEVICE_CONNECT, 'bitbox', (err, res) => {
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
        '0477a352b8edb58aacd4fff8cc336b5d0ef87cd411cdbce41c45d40048bf9777' ===
          result.chainCode
      )
      assert(
        '03ce1eb331d8b3e3628056cafe475ad59465eb612901f628fc630a6fa4fb68bd5b' ===
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
            '0x0e5cdd9f10bd3f3a6a63df69605d8d40c5972a1b790847cd74cd6959464143b83114ef250e0eb0c7aeb1b8a612ab35928f34599c11d785a23fc546376d5bfea31b' ===
              '0x' + result
          )
        }
        socket.emit(
          Events.SIGN_TRANSACTION,
          "m/44'/60'/0'/0/0",
          '0xf8aa8207fd843b9aca008259d894199ec49df90a1d7dffd792c22934aead20304deb80b844a9059cbb000000000000000000000000585f8d56bea90ddb688ffae3695d4fc1270855800000000000000000000000000000000000000000000000000000000011e1a30026a04ecef7dfaf0a29d730f9ef18ffb994e9df94da775747ad20add47b4662cb919ca017a466e9917d0e6481a80483d4ef0122bf3531a89b84e3fdf5ee9b33829af2af', //hello
          (err, result) => {
            console.log('txSign', err, result)
            if (!err) {
              assert(
                'f8aa8207fd843b9aca008259d894199ec49df90a1d7dffd792c22934aead20304deb80b844a9059cbb000000000000000000000000585f8d56bea90ddb688ffae3695d4fc1270855800000000000000000000000000000000000000000000000000000000011e1a30026a0f8bd6324d420d8f47f60f14ce771fdce6f6cc0d4adbc935bec92f8b02645b7bba047ac7c5b1507d8f69e21f6fe86e720da5160230eb32a49398c462b9ceaf24ed5' ===
                  result
              )
            }
          }
        )
      }
    )
  })
}

socket.on(BitboxEvents.BITBOX_PASSWORD, cb => {
  console.log('Please enter the password')
  process.stdin.resume()
  process.stdin.on('data', buffer => {
    var text = buffer.toString().replace(/\n$/, '')
    process.stdin.pause()
    cb(null, text)
  })
})
socket.on(BitboxEvents.BITBOX_ACTION, () => {
  console.log('Press and hold the led for 3 secs')
})
socket.on('error', (err, res) => {
  console.log('ERROR', err, res)
})
