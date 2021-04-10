import { randomBytes as rnRandomBytes } from 'react-native-randombytes'

export const randomBytes = (length) => {
  return new Promise((resolve, reject) => {
    rnRandomBytes(length, (err, bytes) => {
      if (err) reject(err)
      else resolve(bytes)
    })
  })
}