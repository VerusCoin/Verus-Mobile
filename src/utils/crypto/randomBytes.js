import { randomBytes as rnRandomBytes } from 'react-native-randombytes'
import { Buffer } from 'buffer'

export const randomBytes = (length) => {
  if (!Number.isSafeInteger(length) || length < 0) {
    return Promise.reject(new TypeError('Random byte length must be a non-negative safe integer'))
  }

  return new Promise((resolve, reject) => {
    rnRandomBytes(length, (err, bytes) => {
      if (err) {
        reject(err)
      } else if (!Buffer.isBuffer(bytes)) {
        reject(new TypeError('Native random byte result must be a Buffer'))
      } else if (bytes.length !== length) {
        reject(new Error(`Native random byte result length ${bytes.length} did not match requested length ${length}`))
      } else {
        resolve(bytes)
      }
    })
  })
}
