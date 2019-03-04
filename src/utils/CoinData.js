import electrumServers from 'agama-wallet-lib/build/electrum-servers';

export const explorers = {
  KMD: 'https://kmdexplorer.io',
  OOT: 'https://explorer.utrum.io',
  VRSC: 'https://explorer.veruscoin.io',
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
    },
};

export const _coinsList = {
    coins: [
      { id: "OOT", name: "Utrum", description: "", fee: 10000},
      { id: "CCL", name: "CoinCollect", description: "", fee: 10000},
      { id: "DOGE", name: "Dogecoin", description: "", fee: 100000000},
      { id: "DGB", name: "Digibyte", description: "", fee: 100000},
      { id: "BCH", name: "Bitcoin Cash", description: "", fee: 10000},
      { id: "ZEC", name: "ZCash", description: "", fee: 10000},
      { id: "DASH", name: "Dash", description: "", fee: 10000},
      { id: "LTC", name: "Litecoin", description: "", fee: 30000},
    ]
};

//To make flatlist render faster
export const namesList = ['VRSC','KMD','BTC','BCH','CCL',
                          'DASH','DGB','DOGE',
                          'LTC','OOT', 'ZEC']

  // sorting needs to be done
let coinsListSorted = _coinsList.coins;

coinsListSorted.sort((a, b) => {
  if(a.id < b.id) return -1;
  if(a.id > b.id) return 1;
  return 0;
})

coinsListSorted.unshift({ id: "BTC", name: "Bitcoin", description: "The coin that started it all. Bitcoin (BTC) is a peer to peer digital currency created in 2009 by Satoshi Nakamoto.", fee: 10000});
coinsListSorted.unshift({ id: "KMD", name: "Komodo", description: "", fee: 10000});
coinsListSorted.unshift({ 
  id: "VRSC", 
  name: "Verus Coin", 
  description: "Verus Coin includes the first proven 51% hash attack resistant proof of power algorithm. The Verus vision is PBaaS, public blockchains as a service, provisioned for conditional rewards by Verus miners and stakers.", 
  fee: 10000});

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
    throw id + " not found in coin list!";
  }

  return coinObj;
}

export const createCoinObj = (id, name, description, serverList, userName, apps, defaultApp) => {
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

