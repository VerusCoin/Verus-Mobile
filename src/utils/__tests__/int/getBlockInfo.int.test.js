jest.setTimeout(60000)

import { 
  getBlockInfo
} from '../../httpCalls/callCreators'

import {
  getTempActiveCoin,
} from '../../../tests/helpers/MockAuthData'

import { proxyServersHttps, proxyServersHttp } from 'agama-wallet-lib/src/electrum-servers'
jest.mock('agama-wallet-lib/src/electrum-servers')

//TODO: Test for different server version behaviour

describe('Block info fetcher for BTC based chains', () => {
  it('can fetch block info with mock user', () => {
    return getBlockInfo({}, getTempActiveCoin('VRSC', true, 200, {getblockinfo: [136264], getcurrentblock: [118329], server_version: ["ElectrumX"]}), 0)
    .then((res) => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result.block_height).toBe(136264)
    })
  })
})