import { authentication } from '../../../reducers/authentication'
import { ledger } from '../../../reducers/ledger'
import { updates } from '../../../reducers/updates'
import { shouldRejectSessionAction } from '../../../reducers/sessionScope'
import {
  captureSessionScope,
  scopeSessionAction,
  signOutWasAccepted,
} from '../../../actions/actions/updates/sessionRequests'
import {
  occupyCoinApiCall,
  occupyServiceApiCall,
  releaseCoinApiCall,
  releaseServiceApiCall,
} from '../../../actions/actions/updateManager'
import { updateLedgerValue } from '../../../actions/actions/wallet/dispatchers/UpdateLedgerValue'
import {
  serviceUpdates,
  updateServiceData,
} from '../../../actions/actions/services/dispatchers/updates'
import {
  updateWalletData,
  walletUpdates,
} from '../../../actions/actions/wallet/dispatchers/WalletUpdates'
import { CoinDirectory } from '../../CoinData/CoinDirectory'
import Store from '../../../store'
import {
  API_GET_BALANCES,
  API_GET_SERVICE_ACCOUNT,
  ELECTRUM,
  WYRE_SERVICE,
} from '../../constants/intervalConstants'
import {
  AUTHENTICATE_USER,
  BIOMETRIC_AUTH,
  RELEASE_COIN_API_CALL,
  RELEASE_SERVICE_API_CALL,
  RENEW_COIN_DATA,
  RENEW_SERVICE_DATA,
  SET_BALANCES,
  SIGN_OUT,
  UPDATE_SESSION_KEY,
} from '../../constants/storeType'

const ACCOUNT = {id: 'alice', accountHash: 'account-a'}

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return {promise, reject, resolve}
}

describe('session-scoped asynchronous ledger updates', () => {
  let originalAbortController

  beforeEach(() => {
    originalAbortController = global.AbortController
    global.AbortController = class TestAbortController {
      constructor() {
        this.signal = {aborted: false}
      }

      abort() {
        this.signal.aborted = true
      }
    }
  })

  afterEach(() => {
    global.AbortController = originalAbortController
    jest.restoreAllMocks()
  })

  it('keeps the newest request result and rejects an older completion', async () => {
    let state = {
      authentication: authentication(undefined, {type: '@@init'}),
      ledger: ledger(undefined, {type: '@@init'}),
      updates: updates(undefined, {type: '@@init'}),
    }
    const authenticateAction = {
      type: AUTHENTICATE_USER,
      activeAccount: ACCOUNT,
      sessionKey: 'session-key',
    }
    state = {
      authentication: authentication(state.authentication, authenticateAction),
      ledger: ledger(state.ledger, authenticateAction),
      updates: updates(state.updates, authenticateAction),
    }

    const dispatched = []
    const dispatch = action => {
      dispatched.push(action)
      if (shouldRejectSessionAction(state, action)) return
      state = {
        authentication: authentication(state.authentication, action),
        ledger: ledger(state.ledger, action),
        updates: updates(state.updates, action),
      }
    }
    const first = deferred()
    const second = deferred()
    const signals = []
    let invocation = 0
    const fetchChannels = () => ({
      [ELECTRUM]: (_coin, _channel, options) => {
        signals.push(options.signal)
        invocation += 1
        return invocation === 1 ? first.promise : second.promise
      },
    })
    jest.spyOn(CoinDirectory, 'findCoinObj').mockReturnValue({id: 'VRSC'})

    const firstUpdate = updateLedgerValue(
      state,
      dispatch,
      [ELECTRUM],
      'VRSC',
      SET_BALANCES,
      'ERROR_BALANCES',
      fetchChannels,
    )
    const secondUpdate = updateLedgerValue(
      state,
      dispatch,
      [ELECTRUM],
      'VRSC',
      SET_BALANCES,
      'ERROR_BALANCES',
      fetchChannels,
    )

    expect(signals[0].aborted).toBe(true)
    second.resolve({channel: ELECTRUM, chainTicker: 'VRSC', body: {total: 2}})
    await secondUpdate
    expect(state.ledger.balances[ELECTRUM].VRSC.total).toBe(2)

    first.resolve({channel: ELECTRUM, chainTicker: 'VRSC', body: {total: 1}})
    await firstUpdate
    expect(state.ledger.balances[ELECTRUM].VRSC.total).toBe(2)

    const completionActions = dispatched.filter(action => action.type === SET_BALANCES)
    expect(completionActions).toHaveLength(2)
    expect(completionActions[0].meta).toEqual(expect.objectContaining({
      accountHash: ACCOUNT.accountHash,
      requestId: expect.any(String),
      requestKey: expect.any(String),
      sessionEpoch: 1,
      sessionScoped: true,
    }))
  })

  it('clears ledger data immediately and rejects completion after logout', () => {
    let state = {
      authentication: authentication(undefined, {type: '@@init'}),
      ledger: ledger(undefined, {type: '@@init'}),
      updates: updates(undefined, {type: '@@init'}),
    }
    const reduce = action => {
      if (shouldRejectSessionAction(state, action)) return
      state = {
        authentication: authentication(state.authentication, action),
        ledger: ledger(state.ledger, action),
        updates: updates(state.updates, action),
      }
    }
    reduce({
      type: AUTHENTICATE_USER,
      activeAccount: ACCOUNT,
      sessionKey: 'session-key',
    })
    const meta = {
      accountHash: ACCOUNT.accountHash,
      requestId: 'request-1',
      requestKey: 'ledger:SET_BALANCES:VRSC:electrum',
      sessionEpoch: 1,
      sessionScoped: true,
    }
    reduce({
      type: 'SESSION_REQUEST_STARTED',
      payload: {requestId: meta.requestId, requestKey: meta.requestKey},
      meta,
    })
    reduce({
      type: SET_BALANCES,
      payload: {channel: ELECTRUM, chainTicker: 'VRSC', body: {total: 3}},
      meta,
    })

    reduce({type: SIGN_OUT})
    expect(state.authentication.sessionEpoch).toBe(2)
    expect(state.authentication.sessionKey).toBeNull()
    expect(state.ledger.balances[ELECTRUM].VRSC).toBeUndefined()

    const loggedOutState = state
    reduce({
      type: SET_BALANCES,
      payload: {channel: ELECTRUM, chainTicker: 'VRSC', body: {total: 4}},
      meta,
    })
    expect(state).toBe(loggedOutState)
  })

  it('advances the epoch when the live session key changes', () => {
    const initialAuthentication = authentication(undefined, {type: '@@init'})
    const authenticated = authentication(initialAuthentication, {
      type: AUTHENTICATE_USER,
      activeAccount: ACCOUNT,
      sessionKey: 'old-key',
    })
    const updated = authentication(authenticated, {
      type: UPDATE_SESSION_KEY,
      sessionKey: 'new-key',
    })

    expect(updated.sessionEpoch).toBe(authenticated.sessionEpoch + 1)
    expect(updated.sessionKey).toBe('new-key')
  })

  it('centrally rejects a simple account-scoped completion after an account switch', () => {
    const initialAuthentication = authentication(undefined, {type: '@@init'})
    const accountAAuthentication = authentication(initialAuthentication, {
      type: AUTHENTICATE_USER,
      activeAccount: ACCOUNT,
      sessionKey: 'account-a-key',
    })
    const stateA = {
      authentication: accountAAuthentication,
      updates: updates(undefined, {type: '@@init'}),
    }
    const action = scopeSessionAction(
      {
        type: SET_BALANCES,
        payload: {channel: ELECTRUM, chainTicker: 'VRSC', body: {total: 5}},
      },
      captureSessionScope(stateA),
    )

    expect(shouldRejectSessionAction(stateA, action)).toBe(false)

    const stateB = {
      ...stateA,
      authentication: authentication(accountAAuthentication, {
        type: AUTHENTICATE_USER,
        activeAccount: {id: 'bob', accountHash: 'account-b'},
        sessionKey: 'account-b-key',
      }),
    }

    expect(shouldRejectSessionAction(stateB, action)).toBe(true)
  })

  it('rejects a delayed account-A sign-out after account B authenticates', () => {
    const initialAuthentication = authentication(undefined, {type: '@@init'})
    const accountAAuthentication = authentication(initialAuthentication, {
      type: AUTHENTICATE_USER,
      activeAccount: ACCOUNT,
      sessionKey: 'account-a-key',
    })
    const stateA = {
      authentication: accountAAuthentication,
      updates: updates(undefined, {type: '@@init'}),
    }
    const delayedSignOut = scopeSessionAction(
      {type: SIGN_OUT},
      captureSessionScope(stateA),
    )
    const stateB = {
      ...stateA,
      authentication: authentication(accountAAuthentication, {
        type: AUTHENTICATE_USER,
        activeAccount: {id: 'bob', accountHash: 'account-b'},
        sessionKey: 'account-b-key',
      }),
    }

    expect(shouldRejectSessionAction(stateB, delayedSignOut)).toBe(true)
    expect(signOutWasAccepted(stateB, delayedSignOut)).toBe(false)
    expect(stateB.authentication.activeAccount.accountHash).toBe('account-b')
  })

  it('updates a signed-out account biometric flag without creating an active account', () => {
    const signedOut = {
      ...authentication(undefined, {type: '@@init'}),
      activeAccount: null,
      accounts: [{...ACCOUNT, biometry: true}],
    }
    const accounts = [{...ACCOUNT, biometry: false}]

    const updated = authentication(signedOut, {
      type: BIOMETRIC_AUTH,
      payload: {
        accountHash: ACCOUNT.accountHash,
        biometry: false,
        accounts,
      },
    })

    expect(updated.activeAccount).toBeNull()
    expect(updated.accounts).toEqual(accounts)
  })

  it('does not apply another account biometric flag to the active account', () => {
    const activeAccount = {
      id: 'bob',
      accountHash: 'account-b',
      biometry: true,
    }
    const state = {
      ...authentication(undefined, {type: '@@init'}),
      activeAccount,
      accounts: [activeAccount, {...ACCOUNT, biometry: true}],
    }
    const accounts = [activeAccount, {...ACCOUNT, biometry: false}]

    const updated = authentication(state, {
      type: BIOMETRIC_AUTH,
      payload: {
        accountHash: ACCOUNT.accountHash,
        biometry: false,
        accounts,
      },
    })

    expect(updated.activeAccount).toBe(activeAccount)
    expect(updated.accounts).toEqual(accounts)
  })
})

describe('refresh busy locks', () => {
  const initialUpdates = {
    coinUpdateTracker: {
      VRSC: {
        [API_GET_BALANCES]: {busy: {[ELECTRUM]: false}},
      },
    },
    coinUpdateIntervals: {},
    serviceUpdateTracker: {
      [API_GET_SERVICE_ACCOUNT]: {busy: {[WYRE_SERVICE]: false}},
    },
    serviceUpdateIntervals: {},
    latestSessionRequests: {},
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the requested tracker shape and ignores stale lock releases', () => {
    let state = updates(
      initialUpdates,
      occupyCoinApiCall('VRSC', [ELECTRUM], API_GET_BALANCES, 'coin-2'),
    )
    expect(state.coinUpdateTracker.VRSC[API_GET_BALANCES].busy[ELECTRUM]).toBe(true)

    state = updates(
      state,
      releaseCoinApiCall('VRSC', [ELECTRUM], API_GET_BALANCES, 'coin-1'),
    )
    expect(state.coinUpdateTracker.VRSC[API_GET_BALANCES].busy[ELECTRUM]).toBe(true)

    state = updates(
      state,
      releaseCoinApiCall('VRSC', [ELECTRUM], API_GET_BALANCES, 'coin-2'),
    )
    expect(state.coinUpdateTracker.VRSC[API_GET_BALANCES].busy[ELECTRUM]).toBe(false)

    state = updates(
      state,
      occupyServiceApiCall([WYRE_SERVICE], API_GET_SERVICE_ACCOUNT, 'service-2'),
    )
    expect(state.serviceUpdateTracker[API_GET_SERVICE_ACCOUNT].busy[WYRE_SERVICE]).toBe(true)

    state = updates(
      state,
      releaseServiceApiCall([WYRE_SERVICE], API_GET_SERVICE_ACCOUNT, 'service-1'),
    )
    expect(state.serviceUpdateTracker[API_GET_SERVICE_ACCOUNT].busy[WYRE_SERVICE]).toBe(true)

    state = updates(
      state,
      releaseServiceApiCall([WYRE_SERVICE], API_GET_SERVICE_ACCOUNT, 'service-2'),
    )
    expect(state.serviceUpdateTracker[API_GET_SERVICE_ACCOUNT].busy[WYRE_SERVICE]).toBe(false)
  })

  it('releases coin and service locks in finally when an updater throws', async () => {
    const walletOriginal = walletUpdates[API_GET_BALANCES]
    const serviceOriginal = serviceUpdates[API_GET_SERVICE_ACCOUNT]
    walletUpdates[API_GET_BALANCES] = jest.fn().mockRejectedValue(new Error('coin failed'))
    serviceUpdates[API_GET_SERVICE_ACCOUNT] = jest.fn().mockRejectedValue(new Error('service failed'))

    const walletDispatch = jest.fn()
    const serviceDispatch = jest.fn()
    const state = {
      authentication: {
        activeAccount: ACCOUNT,
        sessionEpoch: 1,
      },
      updates: {
        coinUpdateIntervals: {
          VRSC: {[API_GET_BALANCES]: {expire_timeout: 'ALWAYS_ACTIVATED'}},
        },
        serviceUpdateIntervals: {
          [API_GET_SERVICE_ACCOUNT]: {expire_timeout: 'ALWAYS_ACTIVATED'},
        },
      },
    }

    try {
      await expect(
        updateWalletData(state, walletDispatch, [ELECTRUM], 'VRSC', API_GET_BALANCES),
      ).resolves.toBe(false)
      expect(walletDispatch.mock.calls[0][0].type).not.toBe(RELEASE_COIN_API_CALL)
      expect(walletDispatch.mock.calls.slice(-1)[0][0].type).toBe(RELEASE_COIN_API_CALL)

      await expect(
        updateServiceData(state, serviceDispatch, [WYRE_SERVICE], API_GET_SERVICE_ACCOUNT),
      ).resolves.toBe(false)
      expect(serviceDispatch.mock.calls[0][0].type).not.toBe(RELEASE_SERVICE_API_CALL)
      expect(serviceDispatch.mock.calls.slice(-1)[0][0].type).toBe(RELEASE_SERVICE_API_CALL)
    } finally {
      walletUpdates[API_GET_BALANCES] = walletOriginal
      serviceUpdates[API_GET_SERVICE_ACCOUNT] = serviceOriginal
    }
  })

  it('does not renew data or schedule expiry timers when a refresh finishes after an account switch', async () => {
    const walletOriginal = walletUpdates[API_GET_BALANCES]
    const serviceOriginal = serviceUpdates[API_GET_SERVICE_ACCOUNT]
    const walletResult = deferred()
    const serviceResult = deferred()
    walletUpdates[API_GET_BALANCES] = jest.fn().mockReturnValue(walletResult.promise)
    serviceUpdates[API_GET_SERVICE_ACCOUNT] = jest.fn().mockReturnValue(serviceResult.promise)

    const authenticationA = {
      activeAccount: ACCOUNT,
      sessionEpoch: 1,
    }
    const stateA = {
      authentication: authenticationA,
      updates: {
        coinUpdateIntervals: {
          VRSC: {
            [API_GET_BALANCES]: {
              expire_id: null,
              expire_timeout: 60000,
            },
          },
        },
        serviceUpdateIntervals: {
          [API_GET_SERVICE_ACCOUNT]: {
            expire_id: null,
            expire_timeout: 60000,
          },
        },
      },
    }
    const stateB = {
      ...stateA,
      authentication: {
        activeAccount: {id: 'bob', accountHash: 'account-b'},
        sessionEpoch: 2,
      },
    }
    const walletDispatch = jest.fn()
    const serviceDispatch = jest.fn()
    const storeDispatch = jest.spyOn(Store, 'dispatch').mockImplementation(() => {})
    jest.spyOn(Store, 'getState').mockReturnValue(stateB)
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

    try {
      const walletRefresh = updateWalletData(
        stateA,
        walletDispatch,
        [ELECTRUM],
        'VRSC',
        API_GET_BALANCES,
      )
      const serviceRefresh = updateServiceData(
        stateA,
        serviceDispatch,
        [WYRE_SERVICE],
        API_GET_SERVICE_ACCOUNT,
      )

      walletResult.resolve(true)
      serviceResult.resolve(true)

      await expect(walletRefresh).resolves.toBe(false)
      await expect(serviceRefresh).resolves.toBe(false)

      expect(walletDispatch.mock.calls.map(([action]) => action.type)).not.toContain(
        RENEW_COIN_DATA,
      )
      expect(serviceDispatch.mock.calls.map(([action]) => action.type)).not.toContain(
        RENEW_SERVICE_DATA,
      )
      expect(storeDispatch).not.toHaveBeenCalled()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
    } finally {
      walletUpdates[API_GET_BALANCES] = walletOriginal
      serviceUpdates[API_GET_SERVICE_ACCOUNT] = serviceOriginal
    }
  })
})
