import assert from 'assert'
import io from 'socket.io-client'
import Events from '../src/events'
import SecalotEvents from '../src/wallets/secalot/events'
import EC from 'elliptic'
import keccak from 'keccak'
import ethTx from 'ethereumjs-tx'
import { stripHexPrefix } from '../src/wallets/utils'

const socket = io('ws://localhost:6577')
const timeoutPromiseFn = t =>
  new Promise(resolve => {
    setTimeout(() => resolve(), t)
  })
socket.on('connect', () => {
  socket.emit(Events.DEVICE_CONNECT, 'secalot', (err, res) => {
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
  socket.emit(Events.GET_PUBKEY, "m/44'/60'/0'/0/0", (err, result) => {
    console.log('pubkey', err, result)

    var ec = new EC.ec('secp256k1')
    var publicKey = ec.keyFromPublic(result.publicKey, 'hex')

    var messageToSign = '0x68656c6c6f' //hello

    socket.emit(
      Events.SIGN_MESSAGE,
      "m/44'/60'/0'/0/0",
      messageToSign,
      (err, result) => {
        console.log('msgSign', err, result)
        if (!err) {
          messageToSign = stripHexPrefix(messageToSign)
          var header =
            '\x19Ethereum Signed Message:\n' +
            (messageToSign.length / 2).toString()
          messageToSign =
            Buffer.from(header, 'utf8').toString('hex') + messageToSign

          var signature = {
            r: result.substring(0, 64),
            s: result.substring(64, 64 + 64)
          }

          var hash = keccak('keccak256')
            .update(Buffer.from(messageToSign, 'hex'))
            .digest()

          assert(publicKey.verify(hash, signature) === true)
        }
        var txToSign =
          '0xEC0485055AE826008252089451BFCEE6732EEDF1DAAA30F6414AEFFE7B0FA7C288016345785D8A000080038080'
        socket.emit(
          Events.SIGN_TRANSACTION,
          "m/44'/60'/0'/0/0",
          txToSign,
          (err, result) => {
            console.log('txSign', err, result)
            if (!err) {
              var signedTx = new ethTx(result)
              var tx = new ethTx(txToSign)
              tx.raw[6] = Buffer.from([tx._chainId])
              tx.raw[7] = Buffer.from([])
              tx.raw[8] = Buffer.from([])
              tx = tx.serialize()

              var signature = {
                r: signedTx.r.toString('hex'),
                s: signedTx.s.toString('hex')
              }

              var hash = keccak('keccak256')
                .update(tx)
                .digest()

              assert(publicKey.verify(hash, signature) === true)
            }
          }
        )
      }
    )
  })
}

socket.on(SecalotEvents.SECALOT_PIN, cb => {
  console.log('Please enter the PIN-code')
  process.stdin.resume()
  process.stdin.on('data', buffer => {
    var text = buffer.toString().replace(/(\n|\r)+$/, '')
    process.stdin.pause()
    cb(null, text)
  })
})
socket.on(SecalotEvents.SECALOT_CONFIRM, () => {
  console.log('Press the touch button on your device.')
})
socket.on('error', (err, res) => {
  console.log('ERROR', err, res)
})
