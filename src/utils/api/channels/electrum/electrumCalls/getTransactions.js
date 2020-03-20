import { updateValues } from '../callCreators'

export const getOneTransactionList = (oldList, coinObj, activeUser, maxlength = 10) => {
  const callType = 'listtransactions'
  let index = 0
  let params = { raw: true, maxlength: maxlength }
  const coinID = coinObj.id

  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id].electrum != null &&
    activeUser.keys[coinObj.id].electrum.addresses.length > 0
  ) {
    params.address = activeUser.keys[coinObj.id].electrum.addresses[0];
  } else {
    throw new Error(
      "getTransactions.js: Fatal mismatch error, " +
        activeUser.id +
        " user keys for active coin " +
        coinObj.id +
        " not found!"
    );
  }

  return new Promise((resolve, reject) => {
    updateValues(oldList, coinObj.serverList, callType, params, coinID)
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