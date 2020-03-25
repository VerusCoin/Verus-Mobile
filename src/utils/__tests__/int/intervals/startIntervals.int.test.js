jest.setTimeout(120000)

import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import Store from '../../../../store/index'
import { SET_USER_COINS, SET_ACTIVE_SECTION, SET_ACTIVE_COIN, SIGN_IN } from '../../../constants/storeType';
import { activateChainLifecycle } from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import VerusLightClient from 'react-native-verus-light-client';
//import { findCoinObj } from '../../../CoinData/CoinData';

/*describe('general update interval tester', () => {
  it('can electric boogaloo', () => {
    const wait = new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 100000)
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
      type: SIGN_IN,
      activeAccount: MOCK_STATE.authentication.activeAccount
    })
    
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
      activateChainLifecycle('VRSC')

      return wait
    })
    .then(() => {
      console.log(Store.getState())
      expect(true).toBe(true)
    })
  })
})*/