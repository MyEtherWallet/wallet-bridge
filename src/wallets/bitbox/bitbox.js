import os from 'os'
import { decryptAES, encryptAES, doubleHash, openDevice } from './utils'

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

export default class Communication {
  constructor(deviceID) {
    if (!deviceID) {
      throw new Error('device is not available')
    }
    this.device = openDevice(deviceID.path)
    this.secret = ''
  }
  close() {
    this.device.close()
  }
  sendPlain(msg) {
    sendFrame(this.device, msg)
    let response = read(this.device)
    return response
  }
  sendEncrypted(msg, executeBeforeDecrypt) {
    return new Promise(resolve => {
      if (!this.secret || this.secret == '') {
        throw 'password required'
      }
      encryptAES(this.secret, msg).then(data => {
        sendFrame(this.device, data)
        let response = read(this.device)
        if (response.ciphertext) {
          if (executeBeforeDecrypt) {
            executeBeforeDecrypt()
          }
          decryptAES(this.secret, response.ciphertext).then(data => {
            resolve(JSON.parse(data))
          })
        } else {
          resolve(response)
        }
      })
    })
  }
  setCommunicationSecret(password) {
    this.secret = doubleHash(password)
  }
}
