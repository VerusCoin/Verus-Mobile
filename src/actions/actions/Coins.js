import { 
  addActiveCoin,
  setCoinList,
  setCurrentUserCoins,
 } from '../actionCreators';
import { 
  findCoinObj,
  createCoinObj
} from '../../utils/CoinData';
import {
  storeCoins,
  getActiveCoinsList
} from '../../utils/asyncStore';

// Add coin that exists in default list of coins
export const addExistingCoin = (coinID, activeCoins, userName) => {
  let coinIndex = activeCoins.findIndex(x => x.id === coinID);
  
  if (coinIndex > -1) {
    if (activeCoins[coinIndex].users.includes(userName)) {
      throw "Coin already added for user " + userName;
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
    let coinObj = findCoinObj(coinID, userName);
    activeCoins.push(coinObj);
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

// Add custom coin by QR or by form data
export const addCustomCoin = (coinID, activeCoins, userName, coinName, coinDesc, coinServers) => {
  let coinIndex = activeCoins.findIndex(x => x.id === coinID);
  
  if (coinIndex > -1) {
    if (activeCoins[coinIndex].users.includes(userName)) {
      throw "Coin already added for user " + userName;
    }
    else {
      let _activeCoins = activeCoins.slice();
      _activeCoins[coinIndex].users.push(userName);

      storeCoins(_activeCoins)
      .then((res) => {
        if (res === true) {
          return setCoinList(_activeCoins);
        }
        else {
          return false;
        }
      })
    }
  }
  else {
    coinObj = createCoinObj(coinID, coinName, coinDesc, coinServers, userName);
    activeCoins.push(coinObj);
    storeCoins(activeCoins)
    .then((res) => {
      if (res === true) {
        return addActiveCoin(coinObj);
      }
      else {
        return false;
      }
    })
  }
}

export const fetchActiveCoins = () => {
  return new Promise((resolve, reject) => {
    getActiveCoinsList()
      .then(res => {
        resolve(setCoinList(res))
      })
      .catch(err => reject(err));
  });
}

export const setUserCoins = (activeCoinList, userName) => {
  let result = [];
  let toUpdate = []

  for (let i = 0; i < activeCoinList.length; i++) {
    if (activeCoinList[i].users.includes(userName)) {
      result.push(activeCoinList[i]);
      toUpdate.push(activeCoinList[i].id)
    }
  }

  return setCurrentUserCoins(result, toUpdate);
}

