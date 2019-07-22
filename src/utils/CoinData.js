import { electrumServers } from 'agama-wallet-lib/src/electrum-servers';

export const explorers = {
  KMD: 'https://kmdexplorer.io',
  OOT: 'https://explorer.utrum.io',
  VRSC: 'https://explorer.veruscoin.io',
  K64: 'https://k64.explorer.dexstats.info'
}

export const assetsPath = {
    coinLogo: {
        bch: require('../images/cryptologo/bch.png'),		
        vrsc: require('../images/cryptologo/vrsc.png'),
        dash: require('../images/cryptologo/dash.png'),	
        oot: require('../images/cryptologo/oot.png'),		
        btc: require('../images/cryptologo/btc.png'),		
        dgb: require('../images/cryptologo/dgb.png'),		
        doge: require('../images/cryptologo/doge.png'),	
        kmd: require('../images/cryptologo/kmd.png'),		
        zec: require('../images/cryptologo/zec.png'),
        zilla: require('../images/cryptologo/zilla.png'),	
        ltc: require('../images/cryptologo/ltc.png'),		
        ccl: require('../images/cryptologo/ccl.png'),
        k64: require('../images/cryptologo/k64.png')
    },
};

export const _coinsList = {
    coins: [
      { id: "OOT", name: "Utrum", description: "A reward platform for crypto analysis, reviews and predictions", fee: 10000},
      { id: "CCL", name: "CoinCollect", description: "", fee: 10000},
      { id: "DOGE", name: "Dogecoin", description: "", fee: 100000000},
      { id: "DGB", name: "Digibyte", description: "", fee: 100000},
      { id: "BCH", name: "Bitcoin Cash", description: "", fee: 10000},
      { id: "ZEC", name: "ZCash", description: "", fee: 10000},
      { id: "DASH", name: "Dash", description: "", fee: 10000},
      { id: "LTC", name: "Litecoin", description: "", fee: 30000},
      { id: "ZILLA", name: "ChainZilla", description: "The native token of Chainzilla Blockchain Solutions. They are a blockchain consulting company that develops easy to use whitelabel blockchain wallets and applications.", fee: 10000},
      { id: "K64", name: "Komodore64", description: "", fee: 10000}
    ]
};

// sorting needs to be done
let coinsListSorted = _coinsList.coins;

coinsListSorted.sort((a, b) => {
  if(a.id < b.id) return -1;
  if(a.id > b.id) return 1;
  return 0;
})

coinsListSorted.unshift({ id: "BTC", name: "Bitcoin", description: "The coin that started it all. Bitcoin (BTC) is a peer to peer digital currency created in 2009 by Satoshi Nakamoto.", fee: 10000});
coinsListSorted.unshift({ 
  id: "KMD", 
  name: "Komodo", 
  description: "Komodo is an open, modular, multi-chain platform that provides an autonomous, customizable blockchain to every project that builds within the ecosystem.", 
  fee: 10000
});
coinsListSorted.unshift({
  id: "VRSC", 
  name: "Verus Coin", 
  description: "Verus Coin includes the first proven 51% hash attack resistant proof of power algorithm. The Verus vision is PBaaS, public blockchains as a service, provisioned for conditional rewards by Verus miners and stakers.", 
  fee: 10000
});

//To make flatlist render faster
export const namesList = coinsListSorted.map(function(coin) {
  return coin.id;
});

export const coinsList = coinsListSorted;

export const findCoinObj = (id, userName) => {
  let coinObj = coinsList.find(x => x.id === id);

  if (coinObj) {
    coinObj.serverList = electrumServers[id.toLowerCase()];
    coinObj.logo = assetsPath.coinLogo[id.toLowerCase()];
    coinObj.users = [userName];

    //COLOR SCHEME USED FOR APPS IS HERE
    if (!coinObj.apps) {
      coinObj.apps = {
        wallet: {
          title: coinObj.name + ' Wallet', 
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
        }
      }
    }
    
    if (!coinObj.defaultApp) {
      coinObj.defaultApp = 'wallet'
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
 * @param {String[]} serverList A list of electrum servers for the coin
 * @param {String} userName The current user's username (coins must be activated with a user)
 * @param {Object} apps A list of applications the coin supports, 
 * fetched to display in the coin's menu (these still need to be written in order to be used)
 * @param {String} defaultApp The key of the app this coin will start on when selected
 */
export const createCoinObj = (id, name, description, serverList, userName, apps, defaultApp) => {
  let coinObj = coinsList.find(x => x.id === id);

  if (coinObj) {
    throw new Error(`Coin with ID ${id} already exists in coin list`)
  }

  coinObj = {
    id: id,
    name: name,
    description: description,
    serverList: serverList ? serverList : [],
    users: [userName],
    apps: apps,
    defaultApp: defaultApp
  }

  return coinObj;
  
}

