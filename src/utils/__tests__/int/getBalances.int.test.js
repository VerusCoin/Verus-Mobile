jest.setTimeout(60000)

import { 
  getBalances, 
  getOneBalance
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

describe('Balance fetcher for BTC based chains', () => {
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