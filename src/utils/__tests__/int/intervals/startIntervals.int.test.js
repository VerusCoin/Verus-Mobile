jest.setTimeout(120000)

import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import Store from '../../../../store/index'
import { SET_USER_COINS, SET_ACTIVE_SECTION, SET_ACTIVE_COIN, SET_COIN_LIST, AUTHENTICATE_USER, SIGN_IN_USER } from '../../../constants/storeType';
import { activateChainLifecycle } from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import VerusLightClient from 'react-native-verus-light-client';

/*describe('general update interval tester', () => {
  beforeAll(async (done) => {
    
    // Do whatever you need to do
    done()
  })

  it('can electric boogaloo', () => {
    const wait = new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 100000)
    })

    Store.dispatch({
      type: SET_COIN_LIST,
      activeCoinList: MOCK_STATE.coins.activeCoinsForUser
    })

    Store.dispatch({
      type: SET_USER_COINS,
      activeCoinsForUser: MOCK_STATE.coins.activeCoinsForUser
    })

    Store.dispatch({
      type: SET_ACTIVE_SECTION,
      activeSection: MOCK_STATE.coins.activeCoinsForUser[0].apps.wallet.data[0]
    })

    Store.dispatch({
      type: SET_ACTIVE_COIN,
      activeCoin: MOCK_STATE.coins.activeCoinsForUser[0]
    })

    Store.dispatch({
      type: AUTHENTICATE_USER,
      activeAccount: MOCK_STATE.authentication.activeAccount
    })

    Store.dispatch({ type: SIGN_IN_USER })

    console.log(Store.getState().settings)
    
    return VerusLightClient.createWallet(
      "VRSC",
      "vrsc",
      "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0",
      "test.address",
      12345,
      100,
      "hunter2",
      0
    ).then(res => {
      expect(res).toBe(true)

      return VerusLightClient.openWallet("VRSC", "vrsc", "0d09a83e8659dd37b875e43498823459b3e27b42299d80960557d443f6bf98e0")
    })
    .then(res => {
      expect(res).toBe(true)
      activateChainLifecycle('VRSC')

      return wait
    })
    .then(() => {
      const steet = Store.getState()
      console.log(steet)
      console.log(steet.ledger.balances)
      console.log(steet.ledger.balances.dlight)
      console.log(steet.ledger.balances.electrum)
      console.log(steet.errors)
      console.log(steet.errors.get_fiatprice.general)
      
      expect(true).toBe(true)
    })
  })
})*/