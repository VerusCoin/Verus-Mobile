import { updateValues } from '../callCreators'

export const getMerkle = (oldMerkle, coinObj, txid, height, skipServer) => {
  const callType = 'getmerkle'
  let params = { txid: txid, height: height }
  const coinID = coinObj.id

  return new Promise((resolve, reject) => {
    updateValues(oldMerkle, coinObj.serverList.serverList, callType, params, coinID, skipServer)
    .then((response) => {
      if(!response) {
        resolve(false)
      }
      else {
        resolve(response.result)
      }
    })
  });
}
