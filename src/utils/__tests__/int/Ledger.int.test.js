jest.setTimeout(60000)

import {
  MOCK_USER_OBJ,
  MOCK_USER_OBJ_BALANCE_SMALL_VRSC
} from '../../../tests/helpers/MockAuthData'

import {
  MOCK_NEEDS_UPDATE_OBJ
} from '../../../tests/helpers/MockAppState'

import {
  fetchTransactionsForCoin
} from '../../../actions/actionCreators'

import {
  getTempActiveCoin,
} from '../../../tests/helpers/MockAuthData'

import { proxyServersHttps, proxyServersHttp } from 'agama-wallet-lib/src/electrum-servers'
jest.mock('agama-wallet-lib/src/electrum-servers')

describe('Transaction action creator', () => {
  it('can fetch and format VRSC transactions for an empty user', () => {
    return fetchTransactionsForCoin([], getTempActiveCoin('VRSC', true, 200, {listtransactions: [0], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_USER_OBJ, MOCK_NEEDS_UPDATE_OBJ.transactions)
    .then(action => {
      expect(action).toHaveProperty('type')
      expect(action).toHaveProperty('transactions')
      expect(action.transactions).toHaveProperty('VRSC')
      expect(action).toHaveProperty('needsUpdateObj')
      
      expect(action.type).toBe('SET_TRANSACTIONS')
      expect(Array.isArray(action.transactions)).toBe(true)
      expect(typeof action.needsUpdateObj).toBe('object')

      expect(action.transactions.VRSC.length).toBe(0)
      expect(typeof action.needsUpdateObj).toBe('object')
    })
  })

  it('can fetch and format VRSC transactions for a non empty user', () => {
    return fetchTransactionsForCoin([], getTempActiveCoin('VRSC', true, 200, {getblockinfo: [], gettransaction: [], listtransactions: [10], getcurrentblock: [118329], server_version: ["ElectrumX"]}), MOCK_USER_OBJ_BALANCE_SMALL_VRSC, MOCK_NEEDS_UPDATE_OBJ.transactions)
    .then(action => {
      expect(action).toHaveProperty('type')
      expect(action).toHaveProperty('transactions')
      expect(action.transactions).toHaveProperty('VRSC')
      expect(action).toHaveProperty('needsUpdateObj')
      
      expect(action.type).toBe('SET_TRANSACTIONS')
      expect(Array.isArray(action.transactions.VRSC)).toBe(true)
      expect(typeof action.needsUpdateObj).toBe('object')

      expect(action.transactions.VRSC.length).toBe(10)
      expect(typeof action.needsUpdateObj).toBe('object')
    })
  })
})