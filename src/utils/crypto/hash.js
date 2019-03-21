const crypto = require('react-native-crypto');
const Buffer = require('safe-buffer').Buffer;
const bitcoin = require('bitgo-utxo-lib')

import reverse from 'buffer-reverse';

//Data must be a buffer, returns hash of buffer
export const sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest();
}

//Data comes in as a string, returns a string
export const hashRawTx = (rawTxString, network) => {
  if (network.coin === 'btc') {
    return decodeBitcoinTxID(rawTxString, network)
  } else {
    let rawTxBuffer = new Buffer(rawTxString, 'hex')

    return reverse(sha256(sha256(rawTxBuffer))).toString('hex')
  }
}

//Decodes specific bitcoin transaction ID return which is in
//string format seperated by ','
export const decodeBitcoinTxID = (rawTxString, network) => {
  let txid = bitcoin.Transaction.fromHex(rawTxString, network).getId()
  let txidArr = txid.split(",")

  for (let i = 0; i < txidArr.length; i++) {
    txidArr[i] = Number(txidArr[i]).toString(16)
    if (!(isNaN(Number(txidArr[i]))) && txidArr[i].length === 1) {
      txidArr[i] = "0" + txidArr[i]
    }
  }

  return txidArr.join('')
}