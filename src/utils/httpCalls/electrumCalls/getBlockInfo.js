import { updateValues } from '../callCreators'

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
    throw "getBlockInfo.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!";
  }

  return new Promise((resolve, reject) => {
    updateValues(oldBlock, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        resolve(response.result)
      }
    })
  });
}