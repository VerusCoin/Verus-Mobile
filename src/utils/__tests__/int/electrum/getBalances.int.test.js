jest.setTimeout(60000)

import { 
  getBalances, 
  getOneBalance
} from '../../../api/channels/electrum/callCreators'

import {
  getTempActiveCoin,
  MOCK_USER_OBJ
} from '../../../../tests/helpers/MockAuthData'

describe('Balance fetcher for BTC based chains', () => {
  const CONFIRMED_BALANCE_VRSC = 2500
  const UNCONFIRMED_BALANCE_VRSC = 3000
  const CONFIRMED_BALANCE_KMD = 10000
  const UNCONFIRMED_BALANCE_KMD = 12345

  const MOCK_ACTIVE_COINS_FOR_USER = [
    getTempActiveCoin("VRSC", true, 200, {
      getbalance: [CONFIRMED_BALANCE_VRSC, UNCONFIRMED_BALANCE_VRSC],
      getcurrentblock: [118329],
      server_version: ["ElectrumX"],
    }),
    getTempActiveCoin("KMD", true, 200, {
      getbalance: [CONFIRMED_BALANCE_KMD, UNCONFIRMED_BALANCE_KMD],
      getcurrentblock: [118329],
      server_version: ["ElectrumX 13.0.6, 1.4"],
    }),
  ];

  it('can get a single balance for a mock user', () => {
    let fetchCalls = 0
    let fetchedUrls = []

    const unwrappedFetch = fetch
    fetch = async (url, payload) => {
      fetchCalls++
      fetchedUrls.push(url)
      return await unwrappedFetch(url, payload)
    }

    return getOneBalance(MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ)
    .then((res) => {
      console.log(`Called fetch ${fetchCalls} time(s)`)
      console.log(fetchedUrls)
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('electrumUsed')
      expect(res).toHaveProperty('electrumVersion')

      expect(res.result).toHaveProperty('confirmed')
      expect(res.result).toHaveProperty('unconfirmed')
    })
  })

  // it('can get multiple balances for a mock user', () => {
  //   return getBalances(MOCK_ACTIVE_COINS_FOR_USER, MOCK_USER_OBJ)
  //   .then((res) => {
  //     for (let i = 0; i < MOCK_ACTIVE_COINS_FOR_USER.length; i++) {
  //       expect(res).toHaveProperty(MOCK_ACTIVE_COINS_FOR_USER[i].id)

  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('result')
  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('blockHeight')
  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('electrumUsed')
  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('electrumVersion')

  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id].result).toHaveProperty('confirmed')
  //       expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id].result).toHaveProperty('unconfirmed')
  //     }
  //   })
  // })
})