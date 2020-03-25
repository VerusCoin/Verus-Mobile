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

    return reverse(sha256(sha256(rawTxBuffer)))
  }
}

export const hashAccountId = (accountId) => {
  return crypto
    .createHash("sha256")
    .update(new Buffer.from(accountId))
    .digest("hex");
}

//Decodes specific bitcoin transaction ID return which is in
//string format seperated by ','
export const decodeBitcoinTxID = (rawTxString, network) => {
  let txid = bitcoin.Transaction.fromHex(rawTxString, network).getId()
  let txidArr = txid.split(",")

  for (let i = 0; i < txidArr.length; i++) {
    txidArr[i] = Number(txidArr[i])
  }

  return txidArr
}

//Converts hex txid to decimal array
export const hexHashToDecimal = (hexHash) => {
  let hexHashArray = hexHash.match(/.{1,2}/g)

  return hexHashArray.map((byte, index) => {
    return parseInt(byte, 16)
  })
}