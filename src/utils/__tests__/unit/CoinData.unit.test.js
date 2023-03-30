import {
  findCoinObj
} from '../../CoinData/CoinData'

import {
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

jest.unmock('agama-wallet-lib/src/electrum-servers')

describe('Main coin data functions', () => {
  it('can find coin from pre-existing coins list and create coin obj', () => {
    let coinObj = findCoinObj('VRSC', MOCK_USER_OBJ.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('VRSC')
    expect(coinObj).toHaveProperty('serverList')
    expect(coinObj).toHaveProperty('users')
    expect(coinObj.users).toContain(MOCK_USER_OBJ.id)
    expect(coinObj).toHaveProperty('apps')
    expect(coinObj.apps.wallet).toHaveProperty('data')
  })
})