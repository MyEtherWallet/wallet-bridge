const HD_HARDENED = 0x80000000
const parseHDPath = string => {
  return string
    .toLowerCase()
    .split('/')
    .filter(function(p) {
      return p !== 'm'
    })
    .map(function(p) {
      var hardened = false
      if (p[p.length - 1] === "'") {
        hardened = true
        p = p.substr(0, p.length - 1)
      }
      if (isNaN(p)) {
        throw new Error('Not a valid path.')
      }
      var n = parseInt(p)
      if (hardened) {
        n = (n | HD_HARDENED) >>> 0
      }
      return n
    })
}
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
export { parseHDPath, sanitizeHex, stripHexPrefix, getBufferFromHex }
