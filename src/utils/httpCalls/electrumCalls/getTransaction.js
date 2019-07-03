import { updateValues } from '../callCreators'

export const getOneTransaction = (oldTx, coinObj, txid) => {
  const callType = 'gettransaction'
  let index = 0
  let params = { txid: txid }
  const coinID = coinObj.id

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