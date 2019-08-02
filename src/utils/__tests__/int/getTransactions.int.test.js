jest.setTimeout(60000)

import { 
  getOneTransactionList
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ,
  MOCK_USER_OBJ_BALANCE_SMALL_VRSC
} from '../../../tests/helpers/MockAuthData'

describe('TxList fetcher for BTC based coins', () => {
  it('can fetch TxList for empty user', () => {
    return getOneTransactionList({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })

  it('can fetch TxList for user with small # of transactions', () => {
    return getOneTransactionList({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })

  it('can fetch TxList of size 15 for user with small # of transactions', () => {
    return getOneTransactionList({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC, 15)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')
      expect(res.result.length).toBe(15)

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })
})