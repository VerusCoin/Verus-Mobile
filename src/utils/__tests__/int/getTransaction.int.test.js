jest.setTimeout(60000)

import { 
  getOneTransaction
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
} from '../../../tests/helpers/MockAuthData'

import {
  MOCK_TX
} from '../../../tests/helpers/MockChainInfo'

describe('TxInfo fetcher for BTC based coins', () => {
  it('can fetch TxInfo for one transaction based on txid', () => {
    return getOneTransaction({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_TX.id)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(typeof res.result).toBe('string')
    })
  })
})