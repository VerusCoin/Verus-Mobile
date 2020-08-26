import { electrumRequest } from '../callCreators';

export const getBalances = (activeCoinsForUser, activeUser) => {
  let balancePromises = []

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    balancePromises.push(
      getOneBalance(
        activeCoinsForUser[i], 
        activeUser
      ))
  }

  return new Promise((resolve, reject) => {
    Promise.all(balancePromises)
    .then((results) => {
      if (results.every(item => {return !item})) {
        resolve(false)
      } else {
        let balances = {}
        //Alert.alert("Error", JSON.stringify(results));
        for (let i = 0; i < results.length; i++) {
          balances[results[i].coin] = results[i]
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

export const getOneBalance = (coinObj, activeUser) => {
  const callType = 'getbalance'
  let params = {}

  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id].electrum != null &&
    activeUser.keys[coinObj.id].electrum.addresses.length > 0
  ) {    
    params.address = activeUser.keys[coinObj.id].electrum.addresses[0];
  } else {
    throw new Error(
      "getBalances.js: Fatal mismatch error, " +
        activeUser.id +
        " user keys for active coin " +
        coinObj.id +
        " not found!"
    );
  }

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.serverList, callType, params, coinObj.id)
    .then((response) => {
      resolve(response)
    })
    .catch((err) => {
      reject(err)
    })
  });
}
