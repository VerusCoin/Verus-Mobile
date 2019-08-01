jest.setTimeout(60000)

import { 
  getBlockInfo
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

//TODO: Test for different server version behaviour

describe('Block info fetcher for BTC based chains', () => {
  it('can fetch block info with mock user', () => {
    return getBlockInfo({}, MOCK_ACTIVE_COINS_FOR_USER[0], 0)
    .then((res) => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result.block_height).toBe(0)
    })
  })
})