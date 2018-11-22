const padLeftEven = hex => {
  hex = hex.length % 2 != 0 ? '0' + hex : hex
  return hex
}
const sanitizeHex = hex => {
  hex = hex.substring(0, 2) == '0x' ? hex.substring(2) : hex
  if (hex == '') return ''
  return '0x' + padLeftEven(hex)
}
const hasHexPrefix = str => {
  return str.slice(0, 2).toLowerCase() === '0x'
}
const stripHexPrefix = str => {
  return hasHexPrefix(str) ? str.slice(2) : str
}
const getBufferFromHex = hex => {
  const _hex = hex.toLowerCase().replace('0x', '')
  return new Buffer(_hex, 'hex')
}
export {
  padLeftEven,
  sanitizeHex,
  hasHexPrefix,
  stripHexPrefix,
  getBufferFromHex
}
