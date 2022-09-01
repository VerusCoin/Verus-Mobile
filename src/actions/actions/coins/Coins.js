import { 
  setCoinList,
  setCurrentUserCoins,
 } from '../../actionCreators';
import {
  storeCoins,
  getActiveCoinList
} from '../../../utils/asyncStore/asyncStore';
import {
  DLIGHT_PRIVATE,
  ETH,
  ERC20,
  ELECTRUM,
  GENERAL,
  WYRE_SERVICE,
  VRPC,
  VERUSID
} from "../../../utils/constants/intervalConstants";
import { initDlightWallet, closeDlightWallet } from '../channels/dlight/dispatchers/LightWalletReduxManager';
import { initEthWallet, closeEthWallet } from '../channels/eth/dispatchers/EthWalletReduxManager';
import { initErc20Wallet, closeErc20Wallet } from '../channels/erc20/dispatchers/Erc20WalletReduxManager';
import { initElectrumWallet, closeElectrumWallet } from '../channels/electrum/dispatchers/ElectrumWalletReduxManager';
import { initGeneralWallet, closeGeneralWallet } from '../channels/general/dispatchers/GeneralWalletReduxManager';
import { closeVrpcWallet, initVrpcWallet } from '../channels/vrpc/dispatchers/VrpcWalletReduxManager';
import { DISABLED_CHANNELS } from '../../../../env/index'
import store from '../../../store';
import { throwError } from '../../../utils/errors';
import { INACTIVE_COIN } from '../../../utils/constants/errors';
import {
  closeWyreCoinWallet,
  initWyreCoinChannel,
} from "../channels/wyre/dispatchers/WyreWalletReduxManager";
import { closeVerusidWallet, initVerusidWallet } from '../channels/verusid/dispatchers/VerusidWalletReduxManager';

export const COIN_MANAGER_MAP = {
  initializers: {
    [ETH]: initEthWallet,
    [ERC20]: initErc20Wallet,
    [VRPC]: initVrpcWallet,
    [VERUSID]: initVerusidWallet,
    [ELECTRUM]: initElectrumWallet,
    [DLIGHT_PRIVATE]: initDlightWallet,
    [GENERAL]: initGeneralWallet,
    [WYRE_SERVICE]: initWyreCoinChannel
  },
  closers: {
    [ETH]: closeEthWallet,
    [ERC20]: closeErc20Wallet,
    [VRPC]: closeVrpcWallet,
    [VERUSID]: closeVerusidWallet,
    [ELECTRUM]: closeElectrumWallet,
    [DLIGHT_PRIVATE]: closeDlightWallet,
    [GENERAL]: closeGeneralWallet,
    [WYRE_SERVICE]: closeWyreCoinWallet
  }
}

// Add coin by saving it to localstorage, and optionally intialize dlight backend
export const addCoin = (fullCoinObj, activeCoins, userName, channels) => {
  let coinIndex = activeCoins.findIndex(x => x.id === fullCoinObj.id);
  let initializers = []

  Object.keys(COIN_MANAGER_MAP.initializers).map(channel => {
    if (channels.includes(channel)) {
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

// Remove a user's name from an active coin, or removes from all if coinID is 
// null
export const removeExistingCoin = async (coinID, userName, dispatch, deleteWallet = false) => {
  const state = store.getState()
  const activeCoins = state.coins.activeCoinList
  
  const removeWithIndex = (coinIndex) => {
    if (coinIndex > -1 && activeCoins[coinIndex].users.includes(userName)) {
      let userIndex = activeCoins[coinIndex].users.findIndex(n => n === userName);
      let closers = []
  
      Object.keys(COIN_MANAGER_MAP.closers).map(channel => {
        if (
          activeCoins[coinIndex].compatible_channels.includes(channel) &&
          !DISABLED_CHANNELS.includes(channel)
        ) {
          closers.push(
            COIN_MANAGER_MAP.closers[channel](
              activeCoins[coinIndex],
              deleteWallet
            )
          );
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
    } else throwError("Inactive coin", INACTIVE_COIN)
  }
  
  if (coinID != null) {
    let index = activeCoins.findIndex(x => x.id === coinID);

    try {
      dispatch(await removeWithIndex(index))
    } catch(e) {
      if (e.name !== INACTIVE_COIN) throw e
    }
  } else {
    for (let i = 0; i < activeCoins.length; i++) {
      try {
        dispatch(await removeWithIndex(i))
      } catch(e) {
        if (e.name !== INACTIVE_COIN) throw e
      }
    }
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

