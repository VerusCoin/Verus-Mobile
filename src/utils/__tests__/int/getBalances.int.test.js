jest.setTimeout(60000)

import { 
  getBalances, 
  getOneBalance
} from '../../httpCalls/callCreators'

import {
  getTempActiveCoin,
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

import { proxyServersHttps, proxyServersHttp } from 'agama-wallet-lib/src/electrum-servers'
jest.mock('agama-wallet-lib/src/electrum-servers')

describe('Balance fetcher for BTC based chains', () => {
  const CONFIRMED_BALANCE_VRSC = 2500
  const UNCONFIRMED_BALANCE_VRSC = 3000
  const CONFIRMED_BALANCE_KMD = 10000
  const UNCONFIRMED_BALANCE_KMD = 12345

  const MOCK_ACTIVE_COINS_FOR_USER = [
    getTempActiveCoin('VRSC', true, 200, {getbalance: [CONFIRMED_BALANCE_VRSC, UNCONFIRMED_BALANCE_VRSC], getcurrentblock: [118329], server_version: ["ElectrumX"]}),
    getTempActiveCoin('KMD', true, 200, {getbalance: [CONFIRMED_BALANCE_KMD, UNCONFIRMED_BALANCE_KMD], getcurrentblock: [118329], server_version: ["ElectrumX 13.0.6, 1.4"]}),
  ]

  it('can get a single balance for a mock user', () => {
    return getOneBalance({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ)
    .then((res) => {
      expect(res.result).toHaveProperty('result')
      expect(res.result).toHaveProperty('blockHeight')
      expect(res.result).toHaveProperty('serverUsed')
      expect(res.result).toHaveProperty('serverVersion')

      expect(res.result.result).toHaveProperty('confirmed')
      expect(res.result.result).toHaveProperty('unconfirmed')
    })
  })

  it('can get multiple balances for a mock user', () => {
    return getBalances({}, MOCK_ACTIVE_COINS_FOR_USER, MOCK_USER_OBJ)
    .then((res) => {
      for (let i = 0; i < MOCK_ACTIVE_COINS_FOR_USER.length; i++) {
        expect(res).toHaveProperty(MOCK_ACTIVE_COINS_FOR_USER[i].id)

        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('result')
        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('blockHeight')
        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('serverUsed')
        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id]).toHaveProperty('serverVersion')

        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id].result).toHaveProperty('confirmed')
        expect(res[MOCK_ACTIVE_COINS_FOR_USER[i].id].result).toHaveProperty('unconfirmed')
      }
    })
  })
})