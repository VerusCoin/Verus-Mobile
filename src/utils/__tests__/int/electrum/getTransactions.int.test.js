jest.setTimeout(60000)

import { 
  getOneTransactionList
} from '../../../api/channels/electrum/callCreators'

import {
  MOCK_USER_OBJ,
  MOCK_USER_OBJ_BALANCE_SMALL_VRSC
} from '../../../../tests/helpers/MockAuthData'

import {
  getTempActiveCoin,
} from '../../../../tests/helpers/MockAuthData'

jest.mock('agama-wallet-lib/src/electrum-servers')

describe('TxList fetcher for BTC based coins', () => {
  it('can fetch TxList for empty user', () => {
    return getOneTransactionList(getTempActiveCoin('VRSC', true, 200, {listtransactions: [0], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_USER_OBJ)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('electrumUsed')
      expect(res).toHaveProperty('electrumVersion')

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })

  it('can fetch TxList for user with small # of transactions', () => {
    return getOneTransactionList(getTempActiveCoin('VRSC', true, 200, {listtransactions: [10], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_USER_OBJ_BALANCE_SMALL_VRSC)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('electrumUsed')
      expect(res).toHaveProperty('electrumVersion')

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })
})