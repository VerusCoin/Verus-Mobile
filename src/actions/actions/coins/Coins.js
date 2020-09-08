import { 
  setCoinList,
  setCurrentUserCoins,
 } from '../../actionCreators';
import {
  storeCoins,
  getActiveCoinList
} from '../../../utils/asyncStore/asyncStore';
import { DLIGHT, ETH, ERC20, ELECTRUM, GENERAL } from '../../../utils/constants/intervalConstants';
import { initDlightWallet, closeDlightWallet } from '../channels/dlight/dispatchers/LightWalletReduxManager';
import { initEthWallet, closeEthWallet } from '../channels/eth/dispatchers/EthWalletReduxManager';
import { initErc20Wallet, closeErc20Wallet } from '../channels/erc20/dispatchers/Erc20WalletReduxManager';
import { initElectrumWallet, closeElectrumWallet } from '../channels/electrum/dispatchers/ElectrumWalletReduxManager';
import { initGeneralWallet, closeGeneralWallet } from '../channels/general/dispatchers/GeneralWalletReduxManager';
import { DISABLED_CHANNELS } from '../../../../env/main.json'

export const COIN_MANAGER_MAP = {
  initializers: {
    [ETH]: initEthWallet,
    [ERC20]: initErc20Wallet,
    [ELECTRUM]: initElectrumWallet,
    [DLIGHT]: initDlightWallet,
    [GENERAL]: initGeneralWallet
  },
  closers: {
    [ETH]: closeEthWallet,
    [ERC20]: closeErc20Wallet,
    [ELECTRUM]: closeElectrumWallet,
    [DLIGHT]: closeDlightWallet,
    [GENERAL]: closeGeneralWallet
  }
}

// Add coin by saving it to localstorage, and optionally intialize dlight backend
export const addCoin = (fullCoinObj, activeCoins, userName, channels) => {
  let coinIndex = activeCoins.findIndex(x => x.id === fullCoinObj.id);
  let initializers = []

  Object.keys(COIN_MANAGER_MAP.initializers).map(channel => {
    if (!DISABLED_CHANNELS.includes(channel) && channels.includes(channel)) {
      initializers.push(COIN_MANAGER_MAP.initializers[channel](fullCoinObj))
    }
  })
  
  if (coinIndex > -1) {
    if (activeCoins[coinIndex].users.includes(userName)) {
      return new Promise((resolve, reject) => {
        Promise.all(initializers)
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
          return Promise.all(initializers)
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
        return Promise.all(initializers)
      })
      .then(() => {
        resolve(setCoinList(activeCoins))
      })
      .catch(err => reject(err))
    });
  }
}

// Remove a user's name from an active coin
export const removeExistingCoin = (coinID, activeCoins, userName, deleteWallet = false) => {
  let coinIndex = activeCoins.findIndex(x => x.id === coinID);
  
  if (coinIndex > -1 && activeCoins[coinIndex].users.includes(userName)) {
    let userIndex = activeCoins[coinIndex].users.findIndex(n => n === userName);
    let closers = []

    Object.keys(COIN_MANAGER_MAP.closers).map(channel => {
      if (!DISABLED_CHANNELS.includes(channel)) {
        closers.push(COIN_MANAGER_MAP.closers[channel](activeCoins[coinIndex], deleteWallet))
      }
    })

    activeCoins[coinIndex].users.splice(userIndex, 1)

    return new Promise((resolve, reject) => {
      storeCoins(activeCoins)
      .then(() => {
        return Promise.all(closers)
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

