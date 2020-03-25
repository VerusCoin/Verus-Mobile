import { electrumRequest } from '../callCreators'
import {
  parseBlock,
  electrumMerkleRoot,
} from 'agama-wallet-lib/src/block'
import { networks } from 'bitgo-utxo-lib';
import store from '../../../../../store/index';
import { saveBlockHeader } from '../../../../../actions/actionCreators';
import { ELECTRUM_PROTOCOL_CHANGE } from '../../../../constants/constants' 

export const getBlockInfo = (coinObj, blockheight) => {
  const callType = 'getblockinfo'
  let params = { height: blockheight }
  const coinID = coinObj.id
  let blockHeaders = store.getState().headers.headers;

  //If already loaded into redux store (from cache), get data from there and avoid http call
  if (blockHeaders[`${coinObj.id}.${blockheight}`]) {
    return new Promise((resolve, reject) => {resolve(JSON.parse(blockHeaders[`${coinObj.id}.${blockheight}`]))})
  } 

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.serverList, callType, params, coinID)
    .then((res) => {
      if (res !== false && res.electrumVersion >= ELECTRUM_PROTOCOL_CHANGE) {
        let blockInfo = res

        let parsedBlock = parseBlock(
          res.result,
          networks[coinID.toLowerCase()] || networks['default']
        );
        if (parsedBlock.merkleRoot) {
          parsedBlock.merkle_root = electrumMerkleRoot(parsedBlock);
        }

        blockInfo.result = parsedBlock

        res = blockInfo
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