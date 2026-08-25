jest.mock('../../asyncStore/asyncStore', () => ({
  getElectrumVersions: jest.fn(),
  setElectrumVersion: jest.fn(),
  clearCachedVersions: jest.fn(),
  getHeaderCache: jest.fn(),
  setCachedHeader: jest.fn(),
  clearCachedHeaders: jest.fn(),
  getEthTxReceiptCache: jest.fn(),
  setCachedEthTxReceipt: jest.fn(),
  clearCachedEthTxReceipts: jest.fn(),
}))

import * as mockCacheStorage from '../../asyncStore/asyncStore'
import { SET_ETH_TX_RECEIPTS, SET_HEADERS, SET_SERVER_VERSIONS } from '../../constants/storeType'
import { loadServerVersions, saveServerVersion } from '../../../actions/actions/cache/Electrum'
import { loadCachedHeaders, saveBlockHeader } from '../../../actions/actions/cache/Headers'
import { loadEthTxReceipts, saveEthTxReceipt } from '../../../actions/actions/cache/EthTransactionReceipts'

describe('startup cache loaders', () => {
  beforeEach(() => {
    for (const cacheFunction of Object.values(mockCacheStorage)) {
      if (typeof cacheFunction === 'function') cacheFunction.mockReset()
    }

    mockCacheStorage.clearCachedVersions.mockResolvedValue()
    mockCacheStorage.clearCachedHeaders.mockResolvedValue()
    mockCacheStorage.clearCachedEthTxReceipts.mockResolvedValue()
  })

  it.each([
    ['electrum', loadServerVersions, 'getElectrumVersions', 'clearCachedVersions'],
    ['headers', loadCachedHeaders, 'getHeaderCache', 'clearCachedHeaders'],
    ['receipts', loadEthTxReceipts, 'getEthTxReceiptCache', 'clearCachedEthTxReceipts'],
  ])('rejects a %s storage read error into startup recovery', async (
    _name,
    loader,
    getterName,
    clearName,
  ) => {
    const dispatch = jest.fn()
    const storageError = new Error('storage unavailable')
    mockCacheStorage[getterName].mockRejectedValue(storageError)

    await expect(loader(dispatch)).rejects.toBe(storageError)
    expect(mockCacheStorage[clearName]).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('clears a corrupt electrum cache and continues with empty state', async () => {
    const dispatch = jest.fn()
    mockCacheStorage.getElectrumVersions.mockResolvedValue({server: {bad: true}})

    await expect(loadServerVersions(dispatch)).resolves.toBeUndefined()
    expect(mockCacheStorage.clearCachedVersions).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: SET_SERVER_VERSIONS,
      serverVersions: {},
    })
  })

  it('clears a corrupt header cache and continues with empty state', async () => {
    const dispatch = jest.fn()
    mockCacheStorage.getHeaderCache.mockResolvedValue({header: {bad: true}})

    await expect(loadCachedHeaders(dispatch)).resolves.toBeUndefined()
    expect(mockCacheStorage.clearCachedHeaders).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({type: SET_HEADERS, headers: {}})
  })

  it('clears a corrupt receipt cache and continues with empty state', async () => {
    const dispatch = jest.fn()
    mockCacheStorage.getEthTxReceiptCache.mockResolvedValue({txid: '{bad json'})

    await expect(loadEthTxReceipts(dispatch)).resolves.toBeUndefined()
    expect(mockCacheStorage.clearCachedEthTxReceipts).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: SET_ETH_TX_RECEIPTS,
      receipts: {},
    })
  })

  it('settles save failures as rejections instead of hanging', async () => {
    const storageError = new Error('write failed')
    const dispatch = jest.fn()
    const store = {
      dispatch,
      getState: () => ({
        headers: {headers: {}},
        ethtxreceipts: {txReceipts: {}},
      }),
    }

    mockCacheStorage.setElectrumVersion.mockRejectedValue(storageError)
    await expect(saveServerVersion('server', '1.4', dispatch)).rejects.toBe(storageError)

    mockCacheStorage.setCachedHeader.mockRejectedValue(storageError)
    await expect(saveBlockHeader({}, 1, 'VRSC', store)).rejects.toBe(storageError)

    mockCacheStorage.setCachedEthTxReceipt.mockRejectedValue(storageError)
    await expect(saveEthTxReceipt({}, 'txid', store)).rejects.toBe(storageError)
  })
})
