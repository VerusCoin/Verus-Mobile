jest.setTimeout(60000)

import { 
  updateBalances
} from '../../../../actions/actions/wallet/dispatchers/UpdateBalances'

import VerusLightClient from 'react-native-verus-light-client'

import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import { ELECTRUM, DLIGHT } from '../../../constants/intervalConstants'
import ApiException from '../../../api/errors/apiError'

describe('Composite balance updater for BTC based chains', () => {
  it('can get composite balance with dlight failiure', () => {
    let resultActions = []

    return updateBalances(MOCK_STATE, (action) => {
      resultActions.push(action)
    }, [DLIGHT, ELECTRUM], 'VRSC')
    .then(() => {
      expect(resultActions.length).toBe(2)

      const error = resultActions.find(action => action.type == 'ERROR_BALANCES')
      const success = resultActions.find(action => action.type == 'SET_BALANCES')

      expect(error.type).toBe('ERROR_BALANCES')
      expect(error.payload.error instanceof ApiException).toBe(true)
      expect(error.payload.error.channel).toBe('dlight')

      expect(success.type).toBe('SET_BALANCES')
      expect(typeof success.payload.body.confirmed).toBe('number')
      expect(typeof success.payload.body.pending).toBe('number')
      expect(typeof success.payload.body.total).toBe('number')
    
      expect(success.payload.body.total).toBe(undefined)
    })
  })

  it('can get composite balance with electrum failiure', () => {
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

      return updateBalances(MOCK_STATE, (action) => {
        resultActions.push(action)
      }, [DLIGHT, ELECTRUM], 'ZEC')
    }).then(() => {
      expect(resultActions.length).toBe(2)

      const error = resultActions.find(action => action.type == 'ERROR_BALANCES')
      const success = resultActions.find(action => action.type == 'SET_BALANCES')

      expect(error.type).toBe('ERROR_BALANCES')
      expect(error.payload.error instanceof ApiException).toBe(true)
      expect(error.payload.error.channel).toBe('electrum')

      expect(success.type).toBe('SET_BALANCES')
      expect(typeof success.payload.body.confirmed).toBe('number')
      expect(typeof success.payload.body.pending).toBe('number')
      expect(typeof success.payload.body.total).toBe('number')
      
      expect(success.payload.body.total).toBe(undefined)
    })
  })
  

  it('can get composite balance with total success', () => {
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

      return updateBalances(MOCK_STATE, (action) => {
        resultActions.push(action)
      }, [DLIGHT, ELECTRUM], 'VRSC')
    }).then(() => {
      const successDlight = resultActions.find(action => action.payload.channel === DLIGHT)
      const successElectrum = resultActions.find(action => action.payload.channel === ELECTRUM)

      expect(successElectrum.type).toBe('SET_BALANCES')
      expect(successDlight.type).toBe('SET_BALANCES')
      expect(typeof successElectrum.payload.body.confirmed).toBe('number')
      expect(typeof successElectrum.payload.body.pending).toBe('number')
      expect(typeof successElectrum.payload.body.total).toBe('number')
      expect(typeof successDlight.payload.body.z_confirmed).toBe('number')
      expect(typeof successDlight.payload.body.z_pending).toBe('number')
      expect(typeof successDlight.payload.body.z_total).toBe('number')
    })
  })
})