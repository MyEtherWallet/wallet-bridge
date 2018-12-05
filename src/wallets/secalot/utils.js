const splitPath = path => {
  var result = []
  var components = path.split('/')
  components.forEach(function(element, index) {
    var number = parseInt(element, 10)
    if (isNaN(number)) {
      return
    }
    if (element.length > 1 && element[element.length - 1] === "'") {
      number += 0x80000000
    }
    result.push(number)
  })
  return result
}

export { splitPath }
