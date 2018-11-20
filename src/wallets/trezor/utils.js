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
export { parseHDPath }
