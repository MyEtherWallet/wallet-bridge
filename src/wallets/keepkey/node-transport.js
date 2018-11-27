/*
 * Copyright (C) 2015-2016 KeepKey, LLC
 * All Rights Reserved
 */
import { Transport } from '@keepkey/device-client/dist/transport'
import { DeviceClientManager } from '@keepkey/device-client/dist/device-client-manager'
import { HID } from 'node-hid'
import ByteBuffer from 'bytebuffer'

const SEGMENT_SIZE = 63
const REPORT_ID = 63
const ReportIdAB = new Uint8Array(1)
ReportIdAB[0] = REPORT_ID

export default class NodeTransport extends Transport {
  static factory(hidDevice, callback) {
    callback(DeviceClientManager.instance.factory(new NodeTransport(hidDevice)))
  }

  constructor(hidDevice) {
    super({
      vendorId: hidDevice.vendorId,
      deviceId: hidDevice.serialNumber,
      productId: hidDevice.productId
    })
    this.hid = new HID(hidDevice.path)
  }

  _write(message) {
    for (var i = 0, max = message.limit; i < max; i += SEGMENT_SIZE) {
      var payloadFragment = message.slice(
        i,
        Math.min(i + SEGMENT_SIZE, message.limit)
      )

      let frame = ByteBuffer.concat([ReportIdAB, payloadFragment])

      let arr = new Uint8Array(frame.toArrayBuffer()).reduce((acum, b) => {
        acum.push(b)
        return acum
      }, [])

      try {
        this.hid.write(arr)
      } catch (e) {
        console.error(e)
      }
    }
    return Promise.resolve()
  }

  _read() {
    if (this.readInProgress) {
      return Promise.reject('read is not re-entrant')
    }
    this.readInProgress = true
    return new Promise((resolve, reject) => {
      this.hid.read((error, data) => {
        if (error) {
          console.error('Error while reading:', error)
          this.readInProgress = false
          reject(error)
          return
        }

        var reportId = ByteBuffer.wrap(data)
          .slice(0, 1)
          .toUTF8()
          .charCodeAt(0)
        if (reportId !== REPORT_ID) {
          this.readInProgress = false
          console.error('unknown report ID')
          return
        }

        var timeout = setTimeout(() => {
          console.log('timed out')
          this.readInProgress = false
          reject('Message not received')
        }, 1000)

        let message = ByteBuffer.wrap(data)

        let receivedMessage = this.parseReceivedMessage(message)

        if (receivedMessage.bytesRemaining > 0) {
          this.getRemainingFragments(receivedMessage).then(receivedMessage => {
            clearTimeout(timeout)
            receivedMessage.bufferBB.reset()
            this.readInProgress = false
            resolve(receivedMessage)
          })
        } else {
          clearTimeout(timeout)
          receivedMessage.bufferBB.reset()
          this.readInProgress = false
          resolve(receivedMessage)
        }
      })
    })
  }

  getRemainingFragments(receivedMessage) {
    var remainingFragments = Math.ceil(
      receivedMessage.bytesRemaining / SEGMENT_SIZE
    )

    var fragmentChain = Promise.resolve(receivedMessage)
    for (var i = 0; i < remainingFragments; i++) {
      fragmentChain = fragmentChain.then(this.getMessageFragment.bind(this))
    }
    return fragmentChain
  }

  getMessageFragment(receivedMessage) {
    return new Promise(resolve => {
      this.hid.read((error, data) => {
        let bbData = ByteBuffer.wrap(data)

        receivedMessage.bufferBB.append(
          bbData.slice(
            1,
            Math.min(
              bbData.limit,
              receivedMessage.bufferBB.limit -
                receivedMessage.bufferBB.offset +
                1
            )
          )
        )

        resolve(receivedMessage)
      })
    })
  }

  parseReceivedMessage(bbData) {
    let header = this.parseMsgHeader(bbData)
    let bufferBB = new ByteBuffer(header.msgLength).append(
      bbData.slice(Transport.MSG_HEADER_LENGTH + 3)
    )

    return {
      header: header,
      bufferBB: bufferBB,
      bytesRemaining: bufferBB.limit - bufferBB.offset
    }
  }
}
