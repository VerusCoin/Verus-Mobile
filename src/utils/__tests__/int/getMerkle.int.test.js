import { 
  getMerkleHashes,
  getMerkleRoot
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
} from '../../../tests/helpers/MockAuthData'

import {
  MOCK_TX
} from '../../../tests/helpers/MockChainInfo'

describe('Merkle info fetcher for BTC based chains (root and hashes)', () => {
  it('can fetch merkle root from specific txid and height', () => {
    return getMerkleRoot({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_TX.id, MOCK_TX.height, [])
    .then((res) => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')
      
      expect(res.result).toHaveProperty('root')
      expect(res.result).toHaveProperty('height')
      expect(res.result).toHaveProperty('index')
    })
  })

  it('can fetch merkle root from specific txid and height while skipping server', () => {
    return getMerkleRoot({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_TX.id, MOCK_TX.height, ['el0.vrsc.0x03.services:10000:tcp'])
    .then((res) => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')
      
      expect(res.result).toHaveProperty('root')
      expect(res.result).toHaveProperty('height')
      expect(res.result).toHaveProperty('index')
      expect(res.serverUsed).toHaveProperty('ip')
      expect(res.serverUsed.ip).not.toBe('el0.vrsc.0x03.services')
    })
  })

  it('can fetch merkle hashes', () => {
    return getMerkleHashes({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_TX.id, MOCK_TX.height, [])
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result).toHaveProperty('block_height')
      expect(res.result).toHaveProperty('merkle')
      expect(res.result).toHaveProperty('pos')
    })
  })

  it('can fetch merkle hashes while skipping server', () => {
    return getMerkleHashes({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_TX.id, MOCK_TX.height, ['el0.vrsc.0x03.services:10000:tcp'])
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result).toHaveProperty('block_height')
      expect(res.result).toHaveProperty('merkle')
      expect(res.result).toHaveProperty('pos')
      expect(res.serverUsed).toHaveProperty('ip')
      expect(res.serverUsed.ip).not.toBe('el0.vrsc.0x03.services')
    })
  })
})