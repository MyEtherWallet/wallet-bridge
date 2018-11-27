import NodeTransport from './node-transport'
import { devices as getHidDevices } from 'node-hid'
const KEEPKEY_VENDOR_ID = 11044
const KEEPKEY_PRODUCT_ID = 1

const getConnectedDevices = () => {
  const hidDevices = getHidDevices()
  const connectedDeviceList = hidDevices.filter(hidDevice => {
    return (
      hidDevice.vendorId === KEEPKEY_VENDOR_ID &&
      hidDevice.productId === KEEPKEY_PRODUCT_ID
    )
  })
  return connectedDeviceList
}
const isDeviceConnected = () => {
  return getConnectedDevices().length > 0
}
const getKeepKeyDevice = () => {
  return new Promise((resolve, reject) => {
    const connectedDeviceList = getConnectedDevices()
    NodeTransport.factory(connectedDeviceList[0], client => {
      client
        .initialize()
        .then(() => {
          resolve(client)
        })
        .catch(reject)
    })
  })
}
export { getKeepKeyDevice, isDeviceConnected, getConnectedDevices }
