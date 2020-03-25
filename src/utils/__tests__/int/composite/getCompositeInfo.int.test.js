jest.setTimeout(60000)

import { 
  updateInfo
} from '../../../../actions/actions/wallet/dispatchers/UpdateInfo'

import VerusLightClient from 'react-native-verus-light-client'

import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import { ELECTRUM, DLIGHT } from '../../../constants/intervalConstants'
import ApiException from '../../../api/errors/apiError'

describe('Composite info updater for BTC based chains', () => {
  it('can get composite info with dlight failiure', () => {
    let resultActions = []

    return updateInfo(MOCK_STATE, (action) => {
      resultActions.push(action)
    }, [DLIGHT, ELECTRUM], 'VRSC')
    .then(() => {
      expect(resultActions.length).toBe(1)
      const error = resultActions[0]

      expect(error.type).toBe('ERROR_INFO')
      expect(error.payload.error instanceof ApiException).toBe(true)
      expect(error.payload.error.channel).toBe('dlight')
    })
  })
  
  it('can get composite info with total success', () => {
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

      return updateInfo(MOCK_STATE, (action) => {
        resultActions.push(action)
      }, [DLIGHT, ELECTRUM], 'VRSC')
    }).then(() => {
      const successDlight = resultActions[0]

      expect(successDlight.type).toBe('SET_INFO')
      expect(typeof successDlight.payload.body.longestchain).toBe('number')
      expect(typeof successDlight.payload.body.percent).toBe('number')
      expect(typeof successDlight.payload.body.blocks).toBe('number')
      expect(typeof successDlight.payload.body.status).toBe('string')
    })
  })
})