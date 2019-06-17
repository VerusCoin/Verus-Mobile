import { updateValues } from '../callCreators'

export const getOneTransaction = (oldTx, coinObj, activeUser, txid) => {
  const callType = 'gettransaction'
  let index = 0
  let params = { txid: txid }
  const coinID = coinObj.id

  if (activeUser.keys.hasOwnProperty(coinObj.id)) {
    params.address = activeUser.keys[coinObj.id].pubKey
  } else {
    throw new Error("getTransaction.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!");
  }

  return new Promise((resolve, reject) => {
    updateValues(oldTx, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        resolve(response.result)
      }
    })
    .catch((err) => {
      console.log("Caught error in getTransaction.js")
      reject(err)
    })
  });
}