import { electrumRequest } from '../callCreators'

export const getOneTransaction = (coinObj, txid) => {
  const callType = 'gettransaction'
  let params = { txid: txid }
  const coinID = coinObj.id

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.serverList, callType, params, coinID)
    .then((response) => {
      resolve(response)
    })
    .catch((err) => {
      console.log("Caught error in getTransaction.js")
      console.log(err)
      reject(err)
    })
  });
}