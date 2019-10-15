import { electrumServers } from 'agama-wallet-lib/src/electrum-servers';
import { MAX_VERIFICATION } from '../utils/constants'

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
          color: '#2E86AB'
          //Blue
        },
        {
          screen: 'SendCoin',
          icon: 'arrow-upward',
          name: 'Send',
          key: 'wallet-send',
          color: '#EDAE49'
          //Orange
        },
        {
          screen: 'ReceiveCoin',
          icon: 'arrow-downward',
          name: 'Receive',
          key: 'wallet-receive',
          color: '#009B72'
          //Green
        }
      ]
    }}
  })
}

export const explorers = {
  KMD: 'https://kmdexplorer.io',
  OOT: 'https://explorer.utrum.io',
  VRSC: 'https://explorer.veruscoin.io',
  K64: 'https://k64.explorer.dexstats.info'
}

export const defaultAssetsPath = {
  coinLogo: {
    bch: require('../images/cryptologo/default/bch.png'),		
    vrsc: require('../images/cryptologo/default/vrsc.png'),
    dash: require('../images/cryptologo/default/dash.png'),	
    oot: require('../images/cryptologo/default/oot.png'),		
    btc: require('../images/cryptologo/default/btc.png'),		
    dgb: require('../images/cryptologo/default/dgb.png'),		
    doge: require('../images/cryptologo/default/doge.png'),	
    kmd: require('../images/cryptologo/default/kmd.png'),		
    zec: require('../images/cryptologo/default/zec.png'),
    zilla: require('../images/cryptologo/default/zilla.png'),	
    ltc: require('../images/cryptologo/default/ltc.png'),		
    ccl: require('../images/cryptologo/default/ccl.png'),
    k64: require('../images/cryptologo/default/k64.png'),
    default: require('../images/cryptologo/default_chain.png')
  },
};

export const coinsList = {
  vrsc: {
    id: "VRSC", 
    name: "Verus Coin", 
    description: "Verus Coin includes the first proven 51% hash attack resistant proof of power algorithm. The Verus vision is PBaaS, public blockchains as a service, provisioned for conditional rewards by Verus miners and stakers.", 
    fee: 10000
  },
  kmd: { 
    id: "KMD", 
    name: "Komodo", 
    description: "Komodo is an open, modular, multi-chain platform that provides an autonomous, customizable blockchain to every project that builds within the ecosystem.", 
    fee: 10000
  },
  btc: { id: "BTC", name: "Bitcoin", description: "The coin that started it all. Bitcoin (BTC) is a peer to peer digital currency created in 2009 by Satoshi Nakamoto.", fee: 10000},
  oot: { id: "OOT", name: "Utrum", description: "A reward platform for crypto analysis, reviews and predictions", fee: 10000},
  ccl: { id: "CCL", name: "CoinCollect", description: "", fee: 10000},
  doge: { id: "DOGE", name: "Dogecoin", description: "", fee: 100000000},
  dgb: { id: "DGB", name: "Digibyte", description: "", fee: 100000},
  bch: { id: "BCH", name: "Bitcoin Cash", description: "", fee: 10000},
  zec: { id: "ZEC", name: "ZCash", description: "", fee: 10000},
  dash: { id: "DASH", name: "Dash", description: "", fee: 10000},
  ltc: { id: "LTC", name: "Litecoin", description: "", fee: 30000},
  zilla: { id: "ZILLA", name: "ChainZilla", description: "The native token of Chainzilla Blockchain Solutions. They are a blockchain consulting company that develops easy to use whitelabel blockchain wallets and applications.", fee: 10000},
  k64: { id: "K64", name: "Komodore64", description: "", fee: 10000}
};

//To make flatlist render faster
export const namesList = Object.values(coinsList).map(function(coin) {
  return coin.id;
});

export const findCoinObj = (id, userName) => {
  let coinObj = coinsList[id.toLowerCase()]

  if (coinObj) {
    coinObj.serverList = electrumServers[id.toLowerCase()].serverList;
    coinObj.logo = defaultAssetsPath.coinLogo[id.toLowerCase()];
    coinObj.users = [userName];

    if (!coinObj.apps || Object.keys(coinObj.apps).length === 0) {
      const DEFAULT_APPS = getDefaultApps(coinObj.name)
      coinObj.apps = DEFAULT_APPS.apps
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

