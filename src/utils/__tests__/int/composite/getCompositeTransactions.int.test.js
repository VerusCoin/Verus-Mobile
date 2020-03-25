jest.setTimeout(60000)

import { 
  updateTransactions
} from '../../../../actions/actions/wallet/dispatchers/UpdateTransactions'

import VerusLightClient from 'react-native-verus-light-client'
import { getActions } from 'redux'

import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import { ELECTRUM, DLIGHT } from '../../../constants/intervalConstants'
import ApiException from '../../../api/errors/apiError'

describe('Composite transaction updater for BTC based chains', () => {
  it('can get composite transactions with dlight failiure', () => {
    let resultActions = []

    return updateTransactions(MOCK_STATE, (action) => {
      resultActions.push(action)
    }, [DLIGHT, ELECTRUM], 'VRSC')
    .then(() => {
      expect(resultActions.length).toBe(2)

      const error = resultActions.find(action => action.type == 'ERROR_TRANSACTIONS')
      const success = resultActions.find(action => action.type == 'SET_TRANSACTIONS')

      expect(error.type).toBe('ERROR_TRANSACTIONS')
      expect(error.payload.error instanceof ApiException).toBe(true)
      expect(error.payload.error.channel).toBe('dlight')

      expect(success.type).toBe('SET_TRANSACTIONS')
      expect(success.payload.body.length).toBe(10)
    })
  })

  it('can get composite transactions with electrum failiure', () => {
    let resultActions = []

    return VerusLightClient.createWallet(
      "ZEC",
      "btc",
      "test.address",
      12345,
      "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0",
      100,
      "hunter2",
      0
    ).then(res => {
      expect(res).toBe(true)

      return VerusLightClient.openWallet("ZEC", "btc", "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0")
    })
    .then(res => {
      expect(res).toBe(true)

      return updateTransactions(MOCK_STATE, (action) => {
        resultActions.push(action)
      }, [DLIGHT, ELECTRUM], 'ZEC')
    }).then(() => {
      expect(resultActions.length).toBe(2)
    
      const error = resultActions.find(action => action.type == 'ERROR_TRANSACTIONS')
      const success = resultActions.find(action => action.type == 'SET_TRANSACTIONS')

      expect(error.type).toBe('ERROR_TRANSACTIONS')
      expect(error.payload.error instanceof ApiException).toBe(true)
      expect(error.payload.error.channel).toBe('electrum')

      expect(success.type).toBe('SET_TRANSACTIONS')
      expect(success.payload.body.length).toBe(4)
    })
  })
  

  it('can get composite transactions with total success', () => {
    let resultActions = []

    return VerusLightClient.createWallet(
      "VRSC",
      "vrsc",
      "test.address",
      12345,
      "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0",
      100,
      "hunter2",
      0
    ).then(res => {
      expect(res).toBe(true)

      return VerusLightClient.openWallet("VRSC", "vrsc", "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0")
    })
    .then(res => {
      expect(res).toBe(true)

      return updateTransactions(MOCK_STATE, (action) => {
        resultActions.push(action)
      }, [DLIGHT, ELECTRUM], 'VRSC')
    }).then(() => {
      const successDlight = resultActions.find(action => action.payload.channel === DLIGHT)
      const successElectrum = resultActions.find(action => action.payload.channel === ELECTRUM)
      expect(resultActions.length).toBe(2)

      expect(successElectrum.type).toBe('SET_TRANSACTIONS')
      expect(successElectrum.payload.body.length).toBe(10)

      expect(successDlight.type).toBe('SET_TRANSACTIONS')
      expect(successDlight.payload.body.length).toBe(4)
    })
  })
})