jest.setTimeout(60000)

import { 
  getOneTransaction
} from '../../../api/channels/electrum/callCreators'

import {
  MOCK_TX
} from '../../../../tests/helpers/MockChainInfo'

import {
  getTempActiveCoin,
} from '../../../../tests/helpers/MockAuthData'

jest.mock('agama-wallet-lib/src/electrum-servers')

describe('TxInfo fetcher for BTC based coins', () => {
  it('can fetch TxInfo for one transaction based on txid', () => {
    return getOneTransaction(getTempActiveCoin('VRSC', true, 200, {gettransaction: ['cfa84868e18825fe626f6ce805ee506ec266e61dfa39ed6d281e037909f480b4'], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_TX.id)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('electrumUsed')
      expect(res).toHaveProperty('electrumVersion')

      expect(typeof res.result).toBe('string')
    })
  })
})