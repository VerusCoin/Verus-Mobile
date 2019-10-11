import { setFetchParams } from './SetFetchParams'

export const MOCK_USER_OBJ = {
  id: 'AzureDiamond',
  seed: 'hunter2',
  keys: {
    VRSC: {
      pubKey: 'RTbZS48ASp9qtCg4ucyHC8GwF6KG49UNjF',
      privKey: 'Ux4SB7LdzdMVg2s2BuapntC2aiVjEiNdabfhZsb6NCPNJTLEYHTX'
    },
    KMD: {
      pubKey: 'RTbZS48ASp9qtCg4ucyHC8GwF6KG49UNjF',
      privKey: 'Ux4SB7LdzdMVg2s2BuapntC2aiVjEiNdabfhZsb6NCPNJTLEYHTX'
    },
  }
}

//This account represents one of the richest VRSC addresses on the date specified,
//to provide a testing address with a large amount of UTXOs and possibly
//transactions. All of the information obtained from this address is public
//knowledge.
export const MOCK_USER_OBJ_BALANCE_LARGE_VRSC = {
  id: 'VRSC Richlist #2 Address at https://dexstats.info/richlist.php?asset=VRSC as of July 31st, 2019',
  seed: '',
  keys: {
    VRSC: {
      pubKey: 'RFeHXibrwdnrxdKPozadvH8XAsNGXY7bxP',
      privKey: ''
    },
    KMD: {
      pubKey: 'RFeHXibrwdnrxdKPozadvH8XAsNGXY7bxP',
      privKey: ''
    },
  }
}

//TODO: Change to an address with more than one utxo
export const MOCK_USER_OBJ_BALANCE_SMALL_VRSC = {
  id: 'Random address with balance of ~3000 VRSC taken from https://dexstats.info/richlist.php?asset=VRSC on July 31st, 2019',
  seed: '',
  keys: {
    VRSC: {
      pubKey: 'RY7eX5Pm2vJV9SXh2CMC1higVYzLrUeukD',
      privKey: ''
    },
    KMD: {
      pubKey: 'RY7eX5Pm2vJV9SXh2CMC1higVYzLrUeukD',
      privKey: ''
    },
  }
}

export const MOCK_USER_OBJ_BALANCE_SMALL_KMD = {
  id: 'KMD Richlist #1000 Address at https://dexstats.info/richlist.php?asset=KMD as of July 31st, 2019',
  seed: '',
  keys: {
    VRSC: {
      pubKey: 'RYZ62rj6VEgojsWhkxT5ucV6kZnwMGBKr7',
      privKey: ''
    },
    KMD: {
      pubKey: 'RYZ62rj6VEgojsWhkxT5ucV6kZnwMGBKr7',
      privKey: ''
    },
  }
}

/**
 * Returns an active coin object for test users for one function call. The function call
 * result will depend on the inputs to this temporary active coin object.
 * @param {String} coinID Coin ticker for coin being used.
 * @param {Boolean} callsSucceed Determines whether or not server calls made by this active coin will succeed
 * @param {Integer} code Determines the code result of each http call made for this active coin.
 * @param {*} params The parameter array to be fed to the mock function being used, which depends on the electrum call being made. 
 * Refer to __mocks__/react-native-fetch/mocked_results to see all the options.
 * @param {*} errorMsg (Optional) Error message returned if the call fails with an error.
 */
export const getTempActiveCoin = (coinID, callsSucceed, code, params, errorMsg = '') => {return ({
  id: coinID, 
  name: "Test Coin", 
  description: "Coin for testing", 
  fee: 10000,
  users: [
  'AzureDiamond',
  'Random address with balance of ~3000 VRSC taken from https://dexstats.info/richlist.php?asset=VRSC on July 31st, 2019',
  'VRSC Richlist #2 Address at https://dexstats.info/richlist.php?asset=VRSC as of July 31st, 2019'],
  serverList: setFetchParams(callsSucceed, code, params, false, errorMsg),
  apps: {
    wallet: {
      title: 'VRSC Wallet', 
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
  },
  logo: ""
})}

export const MOCK_PIN = '12345'
export const MOCK_SEED = 'hunter2'
export const MOCK_ADDRESS = 'RTbZS48ASp9qtCg4ucyHC8GwF6KG49UNjF'
export const MOCK_SCRIPTHASH = '371acb1c695c759b5049653f4893697187c07e88fe07ee22b30ad4cf39d3ca87'
export const MOCK_ENCRYPTEDKEY = 'a76WqKD6uDccOd5fUEY6CBZEMEhfHBA='
export const MOCK_PRIVKEY = 'Ux4SB7LdzdMVg2s2BuapntC2aiVjEiNdabfhZsb6NCPNJTLEYHTX'