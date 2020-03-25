jest.setTimeout(60000)

import { 
  getBlockInfo
} from '../../../api/channels/electrum/callCreators'

import {
  getTempActiveCoin,
} from '../../../../tests/helpers/MockAuthData'

jest.mock('agama-wallet-lib/src/electrum-servers')

//TODO: Test for different server version behaviour

describe('Block info fetcher for BTC based chains', () => {
  it('can fetch block info with mock user', () => {
    return getBlockInfo(getTempActiveCoin('VRSC', true, 200, {getblockinfo: [136264], getcurrentblock: [118329], server_version: ["ElectrumX"]}), 0)
    .then((res) => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('electrumUsed')
      expect(res).toHaveProperty('electrumVersion')

      expect(res.result.block_height).toBe(136264)
    })
  })
})