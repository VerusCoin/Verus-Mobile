import { updateValues } from '../callCreators'

export const getOneTransactionList = (oldList, coinObj, activeUser) => {
  const callType = 'listtransactions'
  let index = 0
  //TODO: Add option to change max length in general settings
  let params = { raw: true }
  const coinID = coinObj.id

  if (activeUser.keys.hasOwnProperty(coinObj.id)) {
    params.address = activeUser.keys[coinObj.id].pubKey
  } else {
    throw new Error("getTransactions.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!");
  }

  return new Promise((resolve, reject) => {
    updateValues(oldList, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        resolve(response.result)
      }
    })
    .catch((err) => {
      let errorObj = {
        coin: coinObj.id,
        result: {
          result: {},
          blockHeight: 0,
          error: true,
          errorMsg: err.message
        }
      }
      console.log(errorObj)
      reject(errorObj)
    })
  });
}