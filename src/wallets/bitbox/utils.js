import crypto from 'crypto'
import HID from 'node-hid'

const AES_BLOCK_SIZE = 16

const SHA256_SIZE = 32;

const doubleHash = data => {
  data = crypto
    .createHash('sha256')
    .update(data)
    .digest()
  data = crypto
    .createHash('sha256')
    .update(data)
    .digest()
  return data
}

/**
 * Performs a SHA-512 hash on the given data.
 */
const sha512 = (data) => {
  data = crypto
    .createHash('sha512')
    .update(data)
    .digest();
  return data;
}


const encryptAES = (key, msg) => {
  return new Promise(resolve => {
    const iv = crypto.pseudoRandomBytes(AES_BLOCK_SIZE)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = Buffer.from(iv)
    cipher.on('readable', () => {
      const data = cipher.read()
      if (data) {
        encrypted = Buffer.concat([encrypted, data])
      }
    })
    cipher.on('end', () => {
      resolve(encrypted)
    })
    cipher.write(msg)
    cipher.end()
  })
}
const decryptAES = (key, ciphertext_iv) => {
  return new Promise(resolve => {
    const iv = ciphertext_iv.slice(0, AES_BLOCK_SIZE)
    const ciphertext = ciphertext_iv.slice(AES_BLOCK_SIZE)
    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = ''
    cipher.on('readable', () => {
      const data = cipher.read()
      if (data) {
        decrypted += data
      }
    })
    cipher.on('end', () => {
      resolve(decrypted)
    })
    cipher.write(ciphertext)
    cipher.end()
  })
}

const appendHMAC = (key, msg) => {
  return new Promise(resolve => {
    const hmac = crypto.createHmac('sha256', key);
    hmac.on('readable', () => {
      const data = hmac.read();
      if (data) {
        msg = Buffer.concat([msg, data]);
      }
    });
    hmac.on('end', () => {
      resolve(msg);
    });

    // PKCS padding is appended, because autopadding is enabled by default.
    hmac.write(msg);
    hmac.end();
  })
}

const checkHMAC = (key, data) => {
  return new Promise((resolve, reject) => {
    const msg = data.slice(0, -SHA256_SIZE);
    const receivedHmac = data.slice(-SHA256_SIZE);
    const hmac = crypto.createHmac('sha256', key);
    let computedHmac = Buffer.from([]);
    hmac.on('readable', () => {
      const data = hmac.read();
      if (data) {
        computedHmac = Buffer.concat([computedHmac, data]);
      }
    });
    hmac.on('end', () => {
      if (computedHmac.equals(receivedHmac)) {
        resolve(msg);
      } else {
        reject("Message is corrupt");
      }
    });

    // PKCS padding is appended, because autopadding is enabled by default.
    hmac.write(msg);
    hmac.end();
  })
}

const getDeviceInfo = () => {
  const devices = HID.devices()
  var deviceInfo = devices.find(function(d) {
    var isBitBox = d.vendorId === 0x03eb && d.productId === 0x2402
    return isBitBox && (d.usagePage === 0xffff || d.interface === 0)
  })
  if (deviceInfo) {
    return deviceInfo
  }
  return null
}
const openDevice = devicePath => new HID.HID(devicePath)
export { encryptAES, decryptAES, appendHMAC, checkHMAC, doubleHash, sha512, getDeviceInfo, openDevice }
