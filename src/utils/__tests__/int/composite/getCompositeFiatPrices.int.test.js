jest.setTimeout(60000)

import { 
  updateFiatPrices
} from '../../../../actions/actions/wallet/dispatchers/UpdateFiatPrices'
import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import {
  DLIGHT,
  ELECTRUM,
  GENERAL
} from "../../../constants/intervalConstants";

describe('Composite fiat rates updater', () => {
  it('can get composite fiat rates for VRSC', () => {
    let resultActions = []

    return updateFiatPrices(MOCK_STATE, (action) => {
      resultActions.push(action)
    }, [DLIGHT, ELECTRUM, GENERAL], 'VRSC')
    .then(() => {
      expect(resultActions.length).toBe(1)
      const success = resultActions[0]

      expect(success.type).toBe('SET_RATES')
      expect(Object.keys(success.payload.body.rates).length).toBe(33)
      expect(success.payload.header.source).toBe('https://api.coinpaprika.com/v1/coins/vrsc-test-coin/ohlcv/latest')
    })
  })
})