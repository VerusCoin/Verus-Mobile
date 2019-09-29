import { updateValues } from '../callCreators';

export const getBalances = (oldBalances, activeCoinsForUser, activeUser) => {
  let balancePromises = []

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    balancePromises.push(
      getOneBalance(
        oldBalances ? oldBalances[activeCoinsForUser[i].id] : null, 
        activeCoinsForUser[i], 
        activeUser
      ))
  }

  return new Promise((resolve, reject) => {
    Promise.all(balancePromises)
    .then((results) => {
      if (results.every(item => {return !item})) {
        resolve(false)
      }
      else {
        let balances = {}
        //Alert.alert("Error", JSON.stringify(results));
        for (let i = 0; i < results.length; i++) {
          balances[results[i].coin] = results[i].result
        }
        
        resolve(balances)
      }
    })
    .catch((err) => {
      console.log("Caught " + err + " in getBalances.js")
      reject(err)
    })
  });
}

export const getOneBalance = (oldBalance, coinObj, activeUser) => {
  const callType = 'getbalance'
  let index = 0
  let params = {}

  if (activeUser.keys.hasOwnProperty(coinObj.id)) {
    params.address = activeUser.keys[coinObj.id].pubKey
  } else {
    throw new Error("getBalances.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!");
  }

  return new Promise((resolve, reject) => {
    updateValues(oldBalance, coinObj.serverList, callType, params, coinObj.id)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        resolve(response)
      }
    })
    .catch((err) => {
      //If error in server processing is caught, the getBalance call
      //resolves, to let Promise.all resolve, but returns an error 
      //object
      let errorObj = {
        coin: coinObj.id,
        result: {
          result: {
            confirmed: 0,
            unconfirmed: 0
          },
          blockHeight: 0,
          error: true,
          errorMsg: err.message
        }
      }
      console.log(errorObj)
      resolve(errorObj)
    })
  });
}
