import { MOCK_USER_OBJ, getTempActiveCoin } from './MockAuthData'

export const MOCK_NEEDS_UPDATE_OBJ = {
  balances: {
    VRSC: true,
    KMD: true
  },
  transactions: {
    VRSC: true,
    KMD: true
  },
  rates: true
}

export const MOCK_STATE = {
  authentication: {
    activeAccount: MOCK_USER_OBJ
  },
  settings: {
    coinSettings: {
      ['VRSC']: {
        channels: ['electrum', 'general']
      }
    }
  },
  coins: {
    activeCoinsForUser: [
      getTempActiveCoin("VRSC", true, 200, {
        getbalance: [30, 40],
        getcurrentblock: [118329],
        listtransactions: [10],
        server_version: ["ElectrumX"],
        gettransaction: [],
        getblockinfo: []
      }),
      getTempActiveCoin("ZEC", false, 200, {
        getbalance: [30, 40],
        getcurrentblock: [118329],
        listtransactions: [10],
        server_version: ["ElectrumX 13.0.6, 1.4"],
        gettransaction: [],
        getblockinfo: []
      })
    ]
  }
};

