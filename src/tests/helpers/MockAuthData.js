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

export const MOCK_ACTIVE_COINS_FOR_USER = [
  {
    id: "VRSC", 
    name: "Verus Coin", 
    description: "Verus Coin includes the first proven 51% hash attack resistant proof of power algorithm. The Verus vision is PBaaS, public blockchains as a service, provisioned for conditional rewards by Verus miners and stakers.", 
    fee: 10000,
    users: ['AzureDiamond'],
    serverList: {
      serverList: [
        'el0.vrsc.0x03.services:10000:tcp',
        'el1.vrsc.0x03.services:10000:tcp',
      ],
      txfee: 10000
    },
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
  },
  {
    id: "KMD", 
    name: "Komodo", 
    description: "",
    fee: 10000,
    users: ['AzureDiamond'],
    serverList: {
      serverList: [
      'electrum1.cipig.net:10001:tcp',
      'electrum2.cipig.net:10001:tcp',
      ],
      txfee: 10000
    },
    apps: {
      wallet: {
        title: 'Komodo Wallet', 
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
  }
]

export const MOCK_PIN = '12345'
export const MOCK_SEED = 'hunter2'
export const MOCK_ADDRESS = 'RTbZS48ASp9qtCg4ucyHC8GwF6KG49UNjF'
export const MOCK_SCRIPTHASH = '371acb1c695c759b5049653f4893697187c07e88fe07ee22b30ad4cf39d3ca87'
export const MOCK_ENCRYPTEDKEY = 'a76WqKD6uDccOd5fUEY6CBZEMEhfHBA='
export const MOCK_PRIVKEY = 'Ux4SB7LdzdMVg2s2BuapntC2aiVjEiNdabfhZsb6NCPNJTLEYHTX'