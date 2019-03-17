const crypto = require('react-native-crypto');
const Buffer = require('safe-buffer').Buffer;
import reverse from 'buffer-reverse';

export const calculateMerkleRoot = (txid, proof, pos, txBlockHeight) => {
  let index = pos
  const _sha256 = (data) => {
    return crypto.createHash('sha256').update(data).digest();
  }
  let hash = txid;
  let serialized;

  if (__DEV__) {
    console.log("Fetching root for transaction with id " + txid)
    console.log("Hashes required to prove merkle root:")
    console.log(proof)
    console.log("Transaction index in block: " + pos)
  }

  for (i = 0; i < proof.length; i++) {
    const _hashBuff = new Buffer(hash, 'hex');
    const _proofBuff = new Buffer(proof[i], 'hex');

    if ((pos & 1) == 0) {
      serialized = Buffer.concat([reverse(_hashBuff), reverse(_proofBuff)]);
    } else {
      serialized = Buffer.concat([reverse(_proofBuff), reverse(_hashBuff)]);
    }

    hash = reverse(_sha256(_sha256(serialized))).toString('hex');
    pos /= 2;
  }

  if (__DEV__) {
    console.log("Merkle root calculated is " + hash)
  }
  
  return {
    root: hash,
    index: index,
    height: txBlockHeight
  };
}