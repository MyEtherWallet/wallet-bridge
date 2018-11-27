import { getConnectedDevices, isDeviceConnected } from './utils'
import NodeTransport from './node-transport'
import EventEmitter from 'events'
class KeepKeyDevices extends EventEmitter {
  constructor(pollInterval) {
    super()
    this.connectedDevices = []
    this.pollInterval = pollInterval || 2000
    this.interval = setInterval(() => {
      if (isDeviceConnected()) {
        const devices = getConnectedDevices()
        devices.forEach(device => {
          if (!this.connectedDevices.includes(device.path)) {
            NodeTransport.factory(devices[0], client => {
              client.initialize().then(() => {
                console.log(client)
                this.emit('connect', client)
              })
            })
            this.connectedDevices.push(device.path)
          }
          this.connectedDevices.forEach((device, idx) => {
            let isFound = false
            for (let i in devices)
              if (devices[i].path === device) isFound = true
            if (!isFound) {
              this.connectedDevices.splice(idx, 1)
              this.emit('disconnect')
            }
          })
        })
      } else {
        if (this.connectedDevices.length > 0) {
          this.connectedDevices = []
          this.emit('disconnect')
        }
      }
    }, this.pollInterval)
  }
  acquireFirstDevice() {
    return new Promise((resolve, reject) => {
      const devices = getConnectedDevices()
      NodeTransport.factory(devices[0], client => {
        client
          .initialize()
          .then(() => {
            resolve(client)
          })
          .catch(reject)
      })
    })
  }
}
export default KeepKeyDevices
