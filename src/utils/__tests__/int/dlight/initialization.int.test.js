import { MOCK_STATE } from '../../../../tests/helpers/MockAppState'
import Store from '../../../../store/index'
import { SET_USER_COINS, SET_ACTIVE_SECTION, SET_ACTIVE_COIN, SET_COIN_LIST, AUTHENTICATE_USER, SIGN_IN_USER } from '../../../constants/storeType';
import { initDlightWallet, closeDlightWallet } from '../../../../actions/actions/dlight/dispatchers/LightWalletReduxManager';
import { activateChainLifecycle, clearChainLifecycle } from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';

describe('dlight initialization tester', () => {
  beforeAll(async (done) => {
    jest.useFakeTimers()

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

    done()
  })

  it('can successfully initialize and delete VRSC dlight socket with lifecycle fetching data', () => {
    const skip100Seconds = new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 100000)

      jest.advanceTimersByTime(100000);
    })

    return new Promise((resolve, reject) => {
      initDlightWallet(MOCK_STATE.coins.activeCoinsForUser[0])
      .then(() => {
        const state = Store.getState()
        expect(state.coins.dlightSockets.VRSC).toBe(true)
        expect(state.coins.dlightSyncing.VRSC).toBe(true)
        activateChainLifecycle(MOCK_STATE.coins.activeCoinsForUser[0].id)
        
        return skip100Seconds
      }) 
      .then(() => {      
        clearChainLifecycle(MOCK_STATE.coins.activeCoinsForUser[0].id)
        return closeDlightWallet(MOCK_STATE.coins.activeCoinsForUser[0], true)
      })
      .then(() => {
        const state = Store.getState()

        expect(state.ledger.balances.dlight[MOCK_STATE.coins.activeCoinsForUser[0].id].total).toBe(30)
        expect(state.ledger.balances.dlight[MOCK_STATE.coins.activeCoinsForUser[0].id].confirmed).toBe(20)
        expect(state.ledger.balances.dlight[MOCK_STATE.coins.activeCoinsForUser[0].id].pending).toBe(10)
        expect(state.coins.dlightSockets.VRSC).toBe(false)
        expect(state.coins.dlightSyncing.VRSC).toBe(false)

        resolve()
      })
      .catch(err => reject(err))
    })
  })
})