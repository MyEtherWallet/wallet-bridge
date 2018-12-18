import os from 'os'
import semver from 'semver'
import { encryptAES, decryptAES, appendHMAC, checkHMAC, doubleHash, sha512, getDeviceInfo, openDevice } from './utils'

const usbReportSize = 64
const hwwCID = 0xff000000
const u2fHIDTypeInit = 0x80
const u2fHIDVendorFirst = u2fHIDTypeInit | 0x40
const hwwCMD = u2fHIDVendorFirst | 0x01

const getInitialFrameHeader = dataLength => {
  var buffer = Buffer.allocUnsafe(7)
  buffer.writeUInt32BE(hwwCID, 0)
  buffer.writeUInt8(hwwCMD, 4)
  buffer.writeUInt16BE(dataLength & 0xffff, 5)
  return buffer
}

const getContinuedFrameHeader = sequence => {
  var buffer = Buffer.allocUnsafe(5)
  buffer.writeUInt32BE(hwwCID, 0)
  buffer.writeUInt8(sequence, 4)
  return buffer
}

const getBody = msg => {
  let buffer = Buffer.allocUnsafe(msg.length)
  buffer.write(msg, 0, msg.length, 'utf8')
  return buffer
}

const append = (byteArray, buffer, maxLength) => {
  let i = 0
  for (i = 0; i < buffer.length && i < maxLength; i++) {
    byteArray.push(buffer[i])
  }
  return i
}

const send = (device, header, body, offset) => {
  let byteArray = []
  let usedForHeader = append(byteArray, header, usbReportSize)
  let bytesOfBody = append(
    byteArray,
    body.slice(offset),
    usbReportSize - usedForHeader
  )
  if (usedForHeader + bytesOfBody < usbReportSize) {
    let fillLength = usbReportSize - (usedForHeader + bytesOfBody)
    append(byteArray, Buffer.alloc(fillLength, 0xee), fillLength)
  }
  if (os.platform() === 'win32') {
    byteArray.unshift(0)
  }
  device.write(byteArray)
  return bytesOfBody
}

const sendFrame = (device, msg) => {
  var initialHeader = getInitialFrameHeader(msg.length)
  var body = getBody(msg)
  var bodyOffset = 0
  bodyOffset = send(device, initialHeader, body, bodyOffset)
  let sequence = 0
  while (bodyOffset < msg.length) {
    bodyOffset += send(
      device,
      getContinuedFrameHeader(sequence),
      body,
      bodyOffset
    )
    sequence++
  }
}

const toString = (bytes, length) => {
  var string = ''
  for (var i = 0; i < bytes.length && i < length; i++) {
    string += String.fromCharCode(bytes[i])
  }
  return string
}

const read = device => {
  let data = device.readSync()
  if (data.length < 7) {
    throw new Error('Invalid response received from device')
  }
  if (data[0] != 0xff || data[1] != 0 || data[2] != 0 || data[3] != 0) {
    throw new Error('USB command ID mismatch')
  }
  if (data[4] != hwwCMD) {
    throw new Error(
      'USB command frame mismatch (' + data[4] + ', expected ' + hwwCMD + ')'
    )
  }
  let readLength = data[5] * 256 + data[6]
  let readBuffer = Buffer.allocUnsafe(readLength)
  let alreadyRead = readBuffer.write(toString(data.slice(7), readLength), 0)
  while (alreadyRead < readLength) {
    data = device.readSync()
    if (data.length < 5) {
      throw new Error('Invalid response received from device')
    }
    alreadyRead += readBuffer.write(
      toString(data.slice(5), readLength),
      alreadyRead
    )
  }
  let responseText = readBuffer.toString()
  let response = JSON.parse(responseText)
  return response
}

const handleResponse = (device, version, encryptionKey, authenticationKey) => {
  return new Promise((resolve, reject) => {
    let response = read(device)
    if (response.ciphertext) {
      let decodedBytes = Buffer.from(response.ciphertext, 'base64')

      if (version && semver.gte(version, '5.0.0')) {
        // checks the HMAC and, on success, calls the decrypt function
        cryptography.checkHMAC(authenticationKey, decodedBytes).then(encryptedBytes => {
          decryptAES(encryptionKey, encryptedBytes).then(JSON.parse(resolve));
        }, reject);
      } else {
        decryptAES(encryptionKey, decodedBytes).then(JSON.parse(resolve));
      }
    } else {
      resolve(JSON.response(response));
    }
  });
}

export default class Communication {
  constructor(deviceInfo) {
    if (!deviceInfo) {
      throw new Error('device is not available')
    }
    this.device = openDevice(deviceInfo.path)
    this.encryptionKey = '';
    this.authenticationKey = '';
    this.version = deviceInfo.serialNumber.match(/v([0-9]+\.[0-9]+\.[0-9]+)/g)[0];
  }
  setVersion(version) {
    this.version = version;
  }
  close() {
    this.device.close()
  }
  sendPlain(msg) {
    sendFrame(this.device, msg)
    let response = read(this.device)
    return response
  }
  sendEncrypted(msg) {
    return new Promise(resolve => {
      if (!this.encryptionKey || this.encryptionKey == '') {
        throw 'password required'
      }
      const encodeAndSend = data => {
        sendFrame(this.device, data)
        handleResponse(this.device, this.version, this.encryptionKey, this.authenticationKey).then(resolve, resolve);
      }
      if (version && semver.gte(version, '5.0.0')) {
        encryptAES(this.encryptionKey, msg).then(encryptedData => appendHMAC(encryptedData).then(encodeAndSend));
      } else {
        encryptAES(this.encryptionKey, msg).then(encodeAndSend);
      }
    });
  }
  setCommunicationSecret(password) {
    if (this.version && semver.gte(this.version, '5.0.0')) {
      let sharedSecret = cryptography.sha512(cryptography.doubleHash(password));
      this.encryptionKey = sharedSecret.slice(0, 32);
      this.authenticationKey = sharedSecret.slice(32);
    } else {
      this.encryptionKey = cryptography.doubleHash(password);
    }
  }
}
