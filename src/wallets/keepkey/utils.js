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
export { isDeviceConnected, getConnectedDevices }
