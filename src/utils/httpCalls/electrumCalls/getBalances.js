import { updateValues } from '../callCreators';

export const getBalances = (oldBalances, activeCoinsForUser, activeUser) => {
  let balancePromises = []
  let index

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    index = 0
    while (index < activeUser.keys.length && activeUser.keys[index].id !== activeCoinsForUser[i].id) {
      index++;
    }
    if (index < activeUser.keys.length) {
      balancePromises.push(
        getOneBalance(
          oldBalances ? oldBalances[activeCoinsForUser[i].id] : null, 
          activeCoinsForUser[i], 
          activeUser,
          activeCoinsForUser[i].id
          ))
    }
    else {
      throw "getBalances.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!";
    }
  }

  return new Promise((resolve, reject) => {
    Promise.all(balancePromises)
    .then((results) => {
      if (results.every(item => {return !item.new})) {
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
  });
}

export const getOneBalance = (oldBalance, coinObj, activeUser, coinID) => {
  const callType = 'getbalance'
  let index = 0
  let params = {}

  while (index < activeUser.keys.length && coinID !== activeUser.keys[index].id) {
    index++
  }
  if (index < activeUser.keys.length) {
    params.address = activeUser.keys[index].pubKey
  }
  else {
    throw "getBalances.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + activeCoinsForUser[i].id + " not found!";
  }

  return new Promise((resolve, reject) => {
    updateValues(oldBalance, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        resolve(response)
      }
    })
  });
}
