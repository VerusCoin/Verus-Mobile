jest.setTimeout(60000)

import { 
  getMerkleHashes,
  getMerkleRoot
} from '../../httpCalls/callCreators'

import {
  getTempActiveCoin,
} from '../../../tests/helpers/MockAuthData'

import { proxyServersHttps, proxyServersHttp } from 'agama-wallet-lib/src/electrum-servers'
jest.mock('agama-wallet-lib/src/electrum-servers')

import {
  MOCK_TX
} from '../../../tests/helpers/MockChainInfo'

describe('Merkle info fetcher for BTC based chains (root and hashes)', () => {
  it('can fetch merkle root from specific txid and height', () => {
    return getMerkleRoot({}, getTempActiveCoin('VRSC', true, 200, {getmerkle: [204832, '9f01c1d5f7fd67ec40d45e3c81006e18e6239a3b54d6a78e99c2c28cc3915558'], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_TX.id, MOCK_TX.height, [])
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

  it('can fetch merkle hashes', () => {
    return getMerkleHashes({}, getTempActiveCoin('VRSC', true, 200, {getmerkle: [204832, '9f01c1d5f7fd67ec40d45e3c81006e18e6239a3b54d6a78e99c2c28cc3915558'], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_TX.id, MOCK_TX.height, [])
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
})