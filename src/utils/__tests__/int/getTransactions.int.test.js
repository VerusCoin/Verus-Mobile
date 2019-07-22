import { 
  getOneTransactionList
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

describe('TxList fetcher for BTC based coins', () => {
  it('can fetch TxList for user', () => {
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
})