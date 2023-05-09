import { electrumRequest } from '../callCreators'

export const getOneTransaction = (coinObj, txid) => {
  const callType = 'gettransaction'
  let params = { txid: txid }

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj, callType, params)
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