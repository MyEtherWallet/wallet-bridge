import assert from 'assert'
import io from 'socket.io-client'
import Events from '../src/events'
import KeepKeyEvents from '../src/wallets/keepkey/events'
const socket = io('ws://localhost:6577')
const timeoutPromiseFn = t =>
  new Promise(resolve => {
    setTimeout(() => resolve(), t)
  })
socket.on('connect', () => {
  socket.emit(Events.DEVICE_CONNECT, 'keepkey', (err, res) => {
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
        '054626145550f913ba06a7ea570b5e292538fccb6946b179582da15f42e887fa' ===
          result.chainCode
      )
      assert(
        '02be54e66e07c8ea53b849df34e43d76752788e21cb5d2533d78f3288f1d07b66a' ===
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
            '0xb98a8009848be5f2a8ec45fa5806767894ba8604a66a0c37a68daf76206f7ed678086e7f00bb67a2150ceebecb0dc2bfda5a4503208810056a1179a52a59e84e1b' ===
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
                'f8aa8207fd843b9aca008259d894199ec49df90a1d7dffd792c22934aead20304deb80b844a9059cbb000000000000000000000000585f8d56bea90ddb688ffae3695d4fc1270855800000000000000000000000000000000000000000000000000000000011e1a30025a0ec6d25db40d67f317eb5e131b2e91a3c447f3e6cd0509f08ff1b3d635dc15ebca06d2b27407c91be37fc3f72d07651e2e64c409ae97d09f6f7f67b99375bf352a0' ===
                  result
              )
            }
          }
        )
      }
    )
  })
}

socket.on(KeepKeyEvents.KEEPKEY_PIN, cb => {
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
socket.on(KeepKeyEvents.KEEPKEY_PASSWORD, console.log)
socket.on(KeepKeyEvents.KEEPKEY_ACTION, () => {
  console.log('button action')
})
socket.on('error', (err, res) => {
  console.log('ERROR', err, res)
})
