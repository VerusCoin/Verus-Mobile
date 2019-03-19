const crypto = require('react-native-crypto');
const Buffer = require('safe-buffer').Buffer;
import reverse from 'buffer-reverse';

//Data must be a buffer, returns hash of buffer
export const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest();
}

//Data comes in as a string, returns a string
export const hashRawTx = (rawTxString) => {
  let rawTxBuffer = new Buffer(rawTxString, 'hex')

  return reverse(sha256(sha256(rawTxBuffer))).toString('hex')
}