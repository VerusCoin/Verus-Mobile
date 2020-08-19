import { electrumServers } from 'agama-wallet-lib/src/electrum-servers';
import { MAX_VERIFICATION } from '../constants/constants'
import Colors from '../../globals/colors'
import { coinsList } from './CoinsList'
import { DLIGHT, ELECTRUM, GENERAL } from '../constants/intervalConstants';

const getDefaultApps = (coinName, canBuySell = false) => {
  return ({
    defaultApp: 'wallet',
    apps: {
    wallet: {
      title: coinName + ' Wallet', 
      data: [
        {
          screen: 'Overview',
          icon: 'account-balance-wallet',
          name: 'Overview',
          key: 'wallet-overview',
          color: Colors.primaryColor
          //Verus Blue
        },
        {
          screen: 'SendCoin',
          icon: 'arrow-upward',
          name: 'Send',
          key: 'wallet-send',
          color: Colors.infoButtonColor
          //Orange
        },
        {
          screen: 'ReceiveCoin',
          icon: 'arrow-downward',
          name: 'Receive',
          key: 'wallet-receive',
          color: Colors.successButtonColor
          //Green
        }
      ]
    }}
  })
}

const identityApp = {
  identity: {
    title: 'Identity App',
    data: [
      {
        screen: 'Home',
        icon: 'account-balance-wallet',
        name: 'Identity',
        key: 'Home',
        color: Colors.primaryColor
        //Verus Blue
      },
      {
        screen: 'Home',
        icon: 'account-balance-wallet',
        name: 'Personal Information',
        key: 'Personal information',
        color: Colors.primaryColor
      },
    ]
  }
}

export const explorers = {
  KMD: 'https://kmdexplorer.io',
  OOT: 'https://explorer.utrum.io',
  VRSC: 'https://explorer.veruscoin.io'
}

export const defaultAssetsPath = {
  coinLogo: {
    bch: require('../../images/cryptologo/default/bch.png'),		
    vrsc: require('../../images/cryptologo/default/vrsc.png'),
    dash: require('../../images/cryptologo/default/dash.png'),	
    oot: require('../../images/cryptologo/default/oot.png'),		
    btc: require('../../images/cryptologo/default/btc.png'),		
    dgb: require('../../images/cryptologo/default/dgb.png'),		
    doge: require('../../images/cryptologo/default/doge.png'),	
    kmd: require('../../images/cryptologo/default/kmd.png'),		
    zec: require('../../images/cryptologo/default/zec.png'),
    zectest: require('../../images/cryptologo/default/zectest.png'),
    zilla: require('../../images/cryptologo/default/zilla.png'),	
    ltc: require('../../images/cryptologo/default/ltc.png'),		
    ccl: require('../../images/cryptologo/default/ccl.png'),
    default: require('../../images/cryptologo/default_chain.png')
  },
};

//To make flatlist render faster
export const namesList = Object.values(coinsList).map(function(coin) {
  return coin.id;
});

export const findCoinObj = (id, userName) => {
  let coinObj = coinsList[id.toLowerCase()]

  if (coinObj) {
    coinObj.serverList = coinObj.compatible_channels.includes(ELECTRUM) ? electrumServers[id.toLowerCase()].serverList : []
    coinObj.logo = defaultAssetsPath.coinLogo[id.toLowerCase()];
    coinObj.users = userName != null ? [userName] : [];
    
    if (!coinObj.compatible_channels.includes(DLIGHT)) {
      coinObj.overrideCoinSettings = {
        privateAddrs: 0
      }
    }
    
    if (!coinObj.apps || Object.keys(coinObj.apps).length === 0) {
      const DEFAULT_APPS = getDefaultApps(coinObj.name)
      if (global.ENABLE_VERUS_IDENTITIES && (coinObj.id === 'VRSC' || coinObj.id === 'ZECTEST')) {
        coinObj.apps = {...identityApp, ...DEFAULT_APPS.apps};
      } else {
        coinObj.apps = DEFAULT_APPS.apps;
      }
      if (!coinObj.defaultApp) coinObj.defaultApp = DEFAULT_APPS.defaultApp
    } else if (!coinObj.defaultApp) {
      coinObj.defaultApp = Object.keys(coinObj.apps)[0]
    }
  }
  else {
    throw new Error(id + " not found in coin list!")
  }

  return coinObj;
}

/**
 * @param {String} id The coin's identifier to be used in code
 * @param {String} name The coin's full name for display
 * @param {String} description A brief display description of the coin
 * @param {Number} defaultFee The default transaction fee for the coin (in sats)
 * @param {String[]} serverList A list of electrum servers for the coin
 * @param {String} userName The current user's username (coins must be activated with a user)
 * @param {Object} apps A list of applications the coin supports, 
 * fetched to display in the coin's menu (these still need to be written in order to be used)
 * @param {String} defaultApp The key of the app this coin will start on when selected
 */
export const createCoinObj = (id, name, description, defaultFee, serverList, userName, apps, defaultApp) => {
  let coinObj = coinsList[id];
  if (coinObj) throw new Error(`Coin with ID ${id} already exists in coin list`)

  coinObj = {
    id: id,
    name: name,
    description: description,
    logo: defaultAssetsPath.coinLogo.default,
    fee: defaultFee,
    serverList: serverList ? serverList : [],
    users: [userName],
    compatible_channels: [ELECTRUM, GENERAL],
    apps: apps,
    defaultApp: defaultApp,
    overrideCoinSettings: {
      verificationLock: true,
      verificationLvl: MAX_VERIFICATION
    }
  }

  if (!coinObj.apps || Object.keys(coinObj.apps).length === 0) {
    const DEFAULT_APPS = getDefaultApps(coinObj.name)
    coinObj.apps = DEFAULT_APPS.apps
    if (!coinObj.defaultApp) coinObj.defaultApp = DEFAULT_APPS.defaultApp
  } else if (!coinObj.defaultApp) {
    coinObj.defaultApp = Object.keys(coinObj.apps)[0]
  }

  return coinObj;
}

export const getCoinObj = (coinList, coinId) => {
  return coinList.find(coinObj => {
    return coinObj.id === coinId
  })
}

