import crypto from 'crypto'
import HID from 'node-hid'

const AES_BLOCK_SIZE = 16
const doubleHash = data => {
  data = crypto
    .createHash('sha256')
    .update(data)
    .digest()
  data = crypto
    .createHash('sha256')
    .update(data)
    .digest()
  return data
}
const encryptAES = (key, msg) => {
  return new Promise(resolve => {
    const iv = crypto.pseudoRandomBytes(AES_BLOCK_SIZE)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = Buffer.from(iv)
    cipher.on('readable', () => {
      const data = cipher.read()
      if (data) {
        encrypted = Buffer.concat([encrypted, data])
      }
    })
    cipher.on('end', () => {
      resolve(encrypted.toString('base64'))
    })
    cipher.write(msg)
    cipher.end()
  })
}
const decryptAES = (key, encodedCiphertext) => {
  return new Promise(resolve => {
    const ciphertext_iv = Buffer.from(encodedCiphertext, 'base64')
    const iv = ciphertext_iv.slice(0, AES_BLOCK_SIZE)
    const ciphertext = ciphertext_iv.slice(AES_BLOCK_SIZE)
    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = ''
    cipher.on('readable', () => {
      const data = cipher.read()
      if (data) {
        decrypted += data
      }
    })
    cipher.on('end', () => {
      resolve(decrypted)
    })
    cipher.write(ciphertext)
    cipher.end()
  })
}

const getDeviceInfo = () => {
  const devices = HID.devices()
  var deviceInfo = devices.find(function(d) {
    var isBitBox = d.vendorId === 0x03eb && d.productId === 0x2402
    return isBitBox && (d.usagePage === 0xffff || d.interface === 0)
  })
  if (deviceInfo) {
    return deviceInfo
  }
  return null
}
const openDevice = devicePath => new HID.HID(devicePath)
export { encryptAES, decryptAES, doubleHash, getDeviceInfo, openDevice }
