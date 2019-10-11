import { updateValues } from '../callCreators'
import {
  parseBlock,
  electrumMerkleRoot,
} from 'agama-wallet-lib/src/block'
import { networks } from 'bitgo-utxo-lib';
import store from '../../../store/index';
import { saveBlockHeader } from '../../../actions/actionCreators';
import { ELECTRUM_PROTOCOL_CHANGE } from '../../constants' 

export const getBlockInfo = (oldBlock, coinObj, blockheight) => {
  const callType = 'getblockinfo'
  let params = { height: blockheight }
  const coinID = coinObj.id
  let blockHeaders = store.getState().headers.headers;

  //If already loaded into redux store (from cache), get data from there and avoid http call
  if (blockHeaders[`${coinObj.id}.${blockheight}`]) {
    console.log("GOT HEADER FROM CACHE")
    console.log(Object.keys(blockHeaders))
    return new Promise((resolve, reject) => {resolve(JSON.parse(blockHeaders[`${coinObj.id}.${blockheight}`]))})
  } 

  return new Promise((resolve, reject) => {
    updateValues(oldBlock, coinObj.serverList, callType, params, coinID)
    .then((response) => {
      let res

      if(!response.new || !response) {
        res = false
      } else if (response.serverVersion >= ELECTRUM_PROTOCOL_CHANGE) {
        let blockInfo = response.result

        let parsedBlock = parseBlock(
          response.result.result,
          networks[coinID.toLowerCase()] || networks['default']
        );
        if (parsedBlock.merkleRoot) {
          parsedBlock.merkle_root = electrumMerkleRoot(parsedBlock);
        }

        blockInfo.result = parsedBlock

        res = blockInfo
      } else {
        res = response.result
      }

      if (Number(res.blockHeight) - blockheight > MIN_HEADER_CACHE_CONFS && res) {
        return Promise.all([res, saveBlockHeader(res, blockheight, coinObj.id, store)])
      }

      return res
    })
    .then(res => {
      resolve(Array.isArray(res) ? res[0] : res)
    })
    .catch((err) => {
      console.log("Caught error in getBlockInfo.js")
      console.log(err.stack)
      reject(err)
    })
  });
}