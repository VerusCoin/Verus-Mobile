import { updateValues } from '../callCreators'
import {
  parseBlock,
  electrumMerkleRoot,
} from 'agama-wallet-lib/build/block'
import { networks } from 'bitgo-utxo-lib';

export const getBlockInfo = (oldBlock, coinObj, activeUser, blockheight) => {
  const callType = 'getblockinfo'
  let index = 0
  let params = { height: blockheight }
  const coinID = coinObj.id

  while (index < activeUser.keys.length && coinID !== activeUser.keys[index].id) {
    index++
  }
  if (index < activeUser.keys.length) {
    params.address = activeUser.keys[index].pubKey
  }
  else {
    throw new Error("getBlockInfo.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!");
  }

  return new Promise((resolve, reject) => {
    updateValues(oldBlock, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else if (response.serverVersion >= 1.4) {
        let blockInfo = response.result

        let parsedBlock = parseBlock(
          response.result.result,
          networks[coinID.toLowerCase()] || networks['default']
        );
        if (parsedBlock.merkleRoot) {
          parsedBlock.merkle_root = electrumMerkleRoot(parsedBlock);
        }

        blockInfo.result = parsedBlock

        resolve(blockInfo)
      } else {
        resolve(response.result)
      }
    })
    .catch((err) => {
      console.log("Caught error in getBlockInfo.js")
      reject(err)
    })
  });
}