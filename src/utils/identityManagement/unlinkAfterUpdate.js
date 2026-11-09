import store from '../../store';
import {captureSessionScope, scopeSessionAction, sessionScopeIsCurrent} from '../../actions/actions/updates/sessionRequests';
import {unlinkVerusId} from '../../actions/actions/services/dispatchers/verusid/verusid';
import {requestServiceStoredData} from '../auth/authBox';
import {VERUSID_SERVICE_ID} from '../constants/services';
import {SET_WATCHED_VERUSIDS} from '../constants/storeType';
import {validateIdentityAuthority} from './identityDefinition';

const assertCurrent = context => {
  if (!context.sessionScope.accountHash || context.signal?.aborted ||
    !sessionScopeIsCurrent(store.getState(), context.sessionScope)) {
    throw Object.assign(new Error('Account changed before the updated identity could be unlinked.'), {code: 'SESSION_CHANGED'});
  }
};

/**
 * Remove the local link after an accepted update. Repeating this cleanup after
 * a storage or wallet-refresh failure never signs or resubmits the transaction.
 */
export const unlinkUpdatedIdentity = async ({identityAddress, chainTicker}, requestContext) => {
  const context = {
    ...(requestContext || {}),
    sessionScope: requestContext?.sessionScope ||
      (requestContext?.sessionScoped ? requestContext : captureSessionScope(store.getState())),
  };
  assertCurrent(context);
  validateIdentityAuthority(identityAddress, 'Updated identity');
  if (typeof chainTicker !== 'string' || !chainTicker.trim()) throw new Error('Choose the updated identity’s network.');

  // The existing writer removes only this link inside the encrypted-storage
  // queue, preserving concurrently saved identities and registration records.
  await unlinkVerusId(identityAddress, chainTicker, context);
  assertCurrent(context);

  const data = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertCurrent(context);
  store.dispatch(scopeSessionAction({
    type: SET_WATCHED_VERUSIDS,
    payload: {watchedVerusIds: data.linked_ids || {}},
  }, context.sessionScope));
  assertCurrent(context);

  // Rebuild cards/channels immediately, as in the explicit link/unlink flows.
  // Avoid updateVerusIdWallet here: registration polling is unrelated to this
  // completed update and a network error there must not block local cleanup.
  const {setUserCoins} = require('../../actions/actionCreators');
  const {clearChainLifecycle, refreshActiveChainLifecycles} = require('../../actions/actions/intervals/dispatchers/lifecycleManager');
  const state = store.getState();
  clearChainLifecycle(chainTicker, undefined, context.sessionScope);
  assertCurrent(context);

  const action = setUserCoins(state.coins.activeCoinList, state.authentication.activeAccount.id);
  store.dispatch(scopeSessionAction(action, context.sessionScope));
  assertCurrent(context);
  refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
  assertCurrent(context);
  return {unlinked: true};
};
