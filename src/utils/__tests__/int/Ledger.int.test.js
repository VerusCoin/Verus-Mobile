jest.setTimeout(60000)

import {
  MOCK_ACTIVE_COINS_FOR_USER,
  MOCK_USER_OBJ,
  MOCK_USER_OBJ_BALANCE_SMALL_VRSC
} from '../../../tests/helpers/MockAuthData'

import {
  MOCK_NEEDS_UPDATE_OBJ
} from '../../../tests/helpers/MockAppState'

import {
  fetchTransactionsForCoin
} from '../../../actions/actionCreators'

describe('Transaction action creator', () => {
  it('can fetch and format VRSC transactions for an empty user', () => {
    return fetchTransactionsForCoin([], MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ, MOCK_NEEDS_UPDATE_OBJ.transactions)
    .then(res => {
      
    })
  })

  it('can fetch and format VRSC transactions for a non empty user', () => {
    return fetchTransactionsForCoin([], MOCK_ACTIVE_COINS_FOR_USER[0], MOCK_USER_OBJ_BALANCE_SMALL_VRSC, MOCK_NEEDS_UPDATE_OBJ.transactions)
    .then(res => {
      console.log(res.transactions)
    })
  })
})