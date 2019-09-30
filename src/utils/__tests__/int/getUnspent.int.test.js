jest.setTimeout(60000)

import { 
  getUnspent,
  getUnspentFormatted
} from '../../httpCalls/callCreators'

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ_BALANCE_LARGE_VRSC,
  MOCK_USER_OBJ_BALANCE_SMALL_VRSC,
  MOCK_USER_OBJ_BALANCE_SMALL_KMD
} from '../../../tests/helpers/MockAuthData'

describe('Unspent utxo fetcher for BTC based coins', () => {
  it('can fetch unspent VRSC utxos for user', () => {
    return getUnspent({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_LARGE_VRSC)
    .then(res => {
      expect(res).toHaveProperty('result')
      expect(res).toHaveProperty('blockHeight')
      expect(res).toHaveProperty('serverUsed')
      expect(res).toHaveProperty('serverVersion')

      expect(res.result).not.toHaveProperty('error')
      expect(typeof res.result).toBe('object')
    })
  })

  it('can fetch unspent VRSC utxos for user in formatted form from large address (>1000 UTXOS) without verification', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_LARGE_VRSC, false, false, false)
    .then(res => {
      let _utxoList = res.utxoList
      expect(_utxoList.length).toBeGreaterThan(0)

      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(false)
        expect(_utxoList[index].verifiedTxid).toBe(false)
        expect(_utxoList[index].interestSats).toBe(0)
      })
      
      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })

  it('can fetch unspent VRSC utxos for user in formatted form from small address with merkle verification only', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC, true, false, false)
    .then(res => {
      let _utxoList = res.utxoList

      expect(_utxoList.length).toBeGreaterThan(0)
      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).not.toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(true)
        expect(_utxoList[index].verifiedTxid).toBe(false)
        expect(_utxoList[index].interestSats).toBe(0)
      })

      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })

  it('can fetch unspent VRSC utxos for user in formatted form from small address with txid verification only', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC, false, true, false)
    .then(res => {
      let _utxoList = res.utxoList

      expect(_utxoList.length).toBeGreaterThan(0)
      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(false)
        expect(_utxoList[index].verifiedTxid).toBe(true)
        expect(_utxoList[index].interestSats).toBe(0)
      })

      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })

  it('can fetch unspent VRSC utxos for user in formatted form from small address with txid and merkle verification', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC, true, true, false)
    .then(res => {
      let _utxoList = res.utxoList

      expect(_utxoList.length).toBeGreaterThan(0)
      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).not.toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(true)
        expect(_utxoList[index].verifiedTxid).toBe(true)
        expect(_utxoList[index].interestSats).toBe(0)
      })

      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })

  it('can fetch unspent KMD utxos for user in formatted form from small address with interest', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[1], MOCK_USER_OBJ_BALANCE_SMALL_KMD, false, false, false)
    .then(res => {
      let _utxoList = res.utxoList

      expect(_utxoList.length).toBeGreaterThan(0)
      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(false)
        expect(_utxoList[index].verifiedTxid).toBe(true)
        expect(_utxoList[index].interestSats).not.toBe(null)
      })

      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })

  it('can fetch unspent KMD utxos for user in formatted form from small address without interest', () => {
    return getUnspentFormatted({}, MOCK_ACTIVE_COINS_FOR_USER[1], MOCK_USER_OBJ_BALANCE_SMALL_KMD, false, false, true)
    .then(res => {
      let _utxoList = res.utxoList

      expect(_utxoList.length).toBeGreaterThan(0)
      _utxoList.forEach((value, index) => {
        expect(_utxoList[index]).toHaveProperty('txid')
        expect(_utxoList[index]).toHaveProperty('vout')
        expect(_utxoList[index]).toHaveProperty('address')
        expect(_utxoList[index]).toHaveProperty('amountSats')
        expect(_utxoList[index]).toHaveProperty('interestSats')
        expect(_utxoList[index]).toHaveProperty('blockHeight')
        expect(_utxoList[index]).toHaveProperty('confirmations')
        expect(_utxoList[index]).toHaveProperty('verifiedMerkle')
        expect(_utxoList[index]).toHaveProperty('verifiedTxid')
        expect(_utxoList[index]).toHaveProperty('merkleRoot')
  
        expect(_utxoList[index].merkleRoot).toBe(null)
        expect(_utxoList[index].verifiedMerkle).toBe(false)
        expect(_utxoList[index].verifiedTxid).toBe(false)
        expect(_utxoList[index].interestSats).toBe(0)
      })

      expect(res).not.toHaveProperty('error')
      expect(typeof res).toBe('object')
    })
  })
})