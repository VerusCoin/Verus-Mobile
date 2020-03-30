import { 
  setCoinList,
  setCurrentUserCoins,
 } from '../actionCreators';
import { 
  createCoinObj
} from '../../utils/CoinData/CoinData';
import {
  storeCoins,
  getActiveCoinList
} from '../../utils/asyncStore/asyncStore';

// Add coin that exists in default list of coins
export const addExistingCoin = (fullCoinObj, activeCoins, userName) => {
  let coinIndex = activeCoins.findIndex(x => x.id === fullCoinObj.id);
  
  if (coinIndex > -1) {
    if (activeCoins[coinIndex].users.includes(userName)) {
      throw new Error("Coin already added for user " + userName);
    }
    else {
      activeCoins[coinIndex].users.push(userName);
      return new Promise((resolve, reject) => {
        storeCoins(activeCoins)
        .then((res) => {
          if (res === true) {
            resolve(setCoinList(activeCoins))
          }
          else {
            resolve(false);
          }
        })
      });
    }
  }
  else {
    activeCoins.push({...fullCoinObj, users: [userName]});
    return new Promise((resolve, reject) => {
      storeCoins(activeCoins)
      .then((res) => {
        if (res === true) {
          resolve(setCoinList(activeCoins))
        }
        else {
          resolve(false);
        }
      })
    });
  }
}

// Remove a user's name from an active coin
export const removeExistingCoin = (coinID, activeCoins, userName) => {
  let coinIndex = activeCoins.findIndex(x => x.id === coinID);
  
  if (coinIndex > -1 && activeCoins[coinIndex].users.includes(userName)) {
    let userIndex = activeCoins[coinIndex].users.findIndex(n => n === userName);
    activeCoins[coinIndex].users.splice(userIndex, 1);
    return new Promise((resolve, reject) => {
      storeCoins(activeCoins)
      .then((res) => {
        if (res === true) {
          resolve(setCoinList(activeCoins))
        }
        else {
          resolve(false);
        }
      })
    });
  }
  else {
    throw new Error("User " + userName + " has not activated coin " + coinID);
  }
}

export const fetchActiveCoins = () => {
  return new Promise((resolve, reject) => {
    getActiveCoinList()
      .then(res => {
        resolve(setCoinList(res))
      })
      .catch(err => reject(err));
  });
}

export const setUserCoins = (activeCoinList, userName) => {
  let result = [];

  for (let i = 0; i < activeCoinList.length; i++) {
    if (activeCoinList[i].users.includes(userName)) {
      result.push(activeCoinList[i]);
    }
  }

  return setCurrentUserCoins(result);
}

