import { electrumRequest } from '../callCreators'
import { calculateMerkleRoot } from '../../../../crypto/verifyMerkle'

export const getMerkleHashes = (coinObj, txid, height, toSkip) => {
  const callType = 'getmerkle'
  let params = { txid: txid, height: height }
  const coinID = coinObj.id

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.serverList, callType, params, coinID, toSkip)
    .then((response) => {
      resolve(response)
    })
    .catch((err) => {
      console.log("Caught error in getMerkle.js")
      reject(err)
    })
  });
}

export const getMerkleRoot = (coinObj, txid, height, toSkip) => {
  return new Promise((resolve, reject) => {
    getMerkleHashes(coinObj, txid, height, toSkip)
    .then((response) => {
      if(!response || !response.result || !response.result.merkle) {
        if (__DEV__) {
          console.log("Can't calculate merkle root because some information is incomplete:")
          console.log("Response to getMerkleHashes: ") 
          console.log(response)
        }

        resolve(false)
      }
      else {
        resolve({
          ...response,
          result: calculateMerkleRoot(txid, response.result.merkle, response.result.pos, response.result.block_height),
        })
      }
    })
    .catch((err) => {
      console.log("Caught error in getMerkle.js")
      reject(err)
    })
  });
}
