import { 
  setCoinList,
  setCurrentUserCoins,
 } from '../../actionCreators';
import {
  storeCoins,
  getActiveCoinList
} from '../../../utils/asyncStore/asyncStore';
import { DLIGHT } from '../../../utils/constants/intervalConstants';
import { initDlightWallet, closeDlightWallet } from '../dlight/dispatchers/LightWalletReduxManager';

// Add coin by saving it to localstorage, and optionally intialize dlight backend
export const addCoin = (fullCoinObj, activeCoins, userName, channels) => {
  let coinIndex = activeCoins.findIndex(x => x.id === fullCoinObj.id);
  let dlightInit = global.ENABLE_DLIGHT && channels.includes(DLIGHT) ? [initDlightWallet(fullCoinObj)] : []
  
  if (coinIndex > -1) {
    if (activeCoins[coinIndex].users.includes(userName)) {
      // Do nothing except for conditionally enable dlight backend
      return new Promise((resolve, reject) => {
        Promise.all(dlightInit)
        .then(() => {
          resolve(setCoinList(activeCoins))
        })
        .catch(err => reject(err))
      });
    }
    else {
      activeCoins[coinIndex].users.push(userName);
      return new Promise((resolve, reject) => {
        storeCoins(activeCoins)
        .then(() => {
          return Promise.all(dlightInit)
        })
        .then(() => {
          resolve(setCoinList(activeCoins))
        })
        .catch(err => reject(err))
      });
    }
  }
  else {
    activeCoins.push({...fullCoinObj, users: [userName]});
    return new Promise((resolve, reject) => {
      storeCoins(activeCoins)
      .then(() => {
        return Promise.all(dlightInit)
      })
      .then(() => {
        resolve(setCoinList(activeCoins))
      })
      .catch(err => reject(err))
    });
  }
}

// Remove a user's name from an active coin
export const removeExistingCoin = (coinID, activeCoins, userName, closeSocket, deleteWallet = false) => {
  let coinIndex = activeCoins.findIndex(x => x.id === coinID);
  
  if (coinIndex > -1 && activeCoins[coinIndex].users.includes(userName)) {
    let userIndex = activeCoins[coinIndex].users.findIndex(n => n === userName);
    let dlightClose = closeSocket ? [closeDlightWallet(activeCoins[coinIndex], deleteWallet)] : []

    activeCoins[coinIndex].users.splice(userIndex, 1)

    return new Promise((resolve, reject) => {
      storeCoins(activeCoins)
      .then(() => {
        return Promise.all(dlightClose)
      })
      .then(() => {
        resolve(setCoinList(activeCoins))
      })
      .catch(err => reject(err))
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

