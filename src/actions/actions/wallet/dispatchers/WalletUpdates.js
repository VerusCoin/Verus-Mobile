import { updateBalances } from './UpdateBalances'
import { updateInfo } from './UpdateInfo'
import { updateTransactions } from './UpdateTransactions'
import { updateFiatPrices } from './UpdateFiatPrices'
import {
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  API_GET_FIATPRICE,
  API_ABORTED,
  API_ERROR,
  API_SUCCESS,
  ALWAYS_ACTIVATED,
  API_GET_CONVERSION_PATHS,
  API_GET_WITHDRAW_DESTINATIONS,
  API_GET_DEPOSIT_SOURCES,
  API_GET_PENDING_DEPOSITS,
  API_GET_LINKED_IDENTITIES,
  VRPC,
} from '../../../../utils/constants/intervalConstants'
import {
  renewCoinData,
  occupyCoinApiCall,
  releaseCoinApiCall,
} from "../../../actionCreators";
import { createCoinExpireTimeout } from '../../../actionDispatchers'
import { updateConversionPaths } from './UpdateConversionPaths'
import { updateWithdrawDestinations } from './UpdateWithdrawDestinations'
import { updateDepositSources } from './UpdateDepositSources'
import { updatePendingDeposits } from './UpdatePendingDeposits'
import { updateLinkedIdentities } from './UpdateLinkedIdentities'
import Store from '../../../../store'
import {createVrpcRefresh} from '../../../../utils/vrpc/vrpcRefresh';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../updates/sessionRequests'

// Map of update functions to be able to call them through standardized 
// API call constants. Each function requires the same three parameters: (store, mode, chainTicker)
export const walletUpdates = {
  [API_GET_BALANCES]: updateBalances,
  [API_GET_INFO]: updateInfo,
  [API_GET_CONVERSION_PATHS]: updateConversionPaths,
  [API_GET_WITHDRAW_DESTINATIONS]: updateWithdrawDestinations,
  [API_GET_DEPOSIT_SOURCES]: updateDepositSources,
  [API_GET_TRANSACTIONS]: updateTransactions,
  [API_GET_FIATPRICE]: updateFiatPrices,
  [API_GET_PENDING_DEPOSITS]: updatePendingDeposits,
  [API_GET_LINKED_IDENTITIES]: updateLinkedIdentities
}

let walletRefreshSequence = 0;

/**
 * Calls the specified API update function and renews (un-expires) the data in the 
 * redux store if the API call succeeded.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker symbol of chain being called
 * @param {String} updateId Name of API call to update
 * @param {Function} onExpire (Optional) Function to execute on data expiry
 * @param {Object} requestContext (Optional) Prepared reads shared by this refresh
 */
export const updateWalletData = async (
  state,
  dispatch,
  channels,
  chainTicker,
  updateId,
  onExpire,
  requestContext,
) => {
  const sessionScope = captureSessionScope(state)
  const requestId = `wallet-refresh:${Date.now()}:${++walletRefreshSequence}`;
  dispatch(
    scopeSessionAction(
      occupyCoinApiCall(chainTicker, channels, updateId, requestId),
      sessionScope,
    ),
  )
  let noError = false

  try {
    if(await walletUpdates[updateId](state, dispatch, channels, chainTicker, requestContext)) {
      // The channel updater can finish successfully after the user has switched
      // accounts. Its result actions are reducer-gated, but refresh bookkeeping
      // and timers must be stopped here before they can affect the new session.
      if (!sessionScopeIsCurrent(Store.getState(), sessionScope)) return false

      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout !== ALWAYS_ACTIVATED) {        
        dispatch(
          scopeSessionAction(
            renewCoinData(chainTicker, updateId),
            sessionScope,
          ),
        )
      }

      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id) {
        //console.log(`Going to clear expire timeout for ${updateId}: ${state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id}`)
        clearTimeout(state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id)
      }
      createCoinExpireTimeout(
        state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout,
        chainTicker,
        updateId,
        onExpire,
        sessionScope,
      )
      noError = true
    }
  } catch (e) {
    console.warn(e)
  } finally {
    dispatch(
      scopeSessionAction(
        releaseCoinApiCall(chainTicker, channels, updateId, requestId),
        sessionScope,
      ),
    )
  }
  
  return noError
}

// Keep scheduling and screen refreshes subject to the same freshness, busy,
// channel-open and screen-visibility rules before adding work to a batch.
const eligibleChannels = (state, chainTicker, updateId) => {
  const update = state.updates.coinUpdateTracker[chainTicker]?.[updateId];

  if (!update?.needs_update) return [];

  const {activeSection, activeCoin, coinMenuFocused} = state.coins;

  if (update.coin_bound && (!coinMenuFocused || activeCoin?.id !== chainTicker)) {
    return [];
  }

  if (update.update_locations != null &&
      (!coinMenuFocused || !update.update_locations.includes(activeSection?.key))) {
    return [];
  }

  return [...new Set(update.channels)].filter(channelId => {
    const parentChannel = channelId.split('.')[0];

    return !update.busy?.[channelId] &&
      state[`channelStore_${parentChannel}`]?.openCoinChannels[chainTicker];
  });
};

/**
 * Prepare a complete refresh before starting its network work. The same entry
 * point serves interval ticks and screen refreshes, so address requests from
 * different update types and currencies share one plan instead of a timer window.
 * Existing channel updaters still own result dispatch, errors and expiry state.
 */
export const conditionallyUpdateWallets = async (state, dispatch, updates) => {
  const sessionScope = captureSessionScope(state);
  const isCurrent = () => sessionScopeIsCurrent(Store.getState(), sessionScope);

  if (!isCurrent()) return updates.map(() => API_ABORTED);

  const jobs = new Map();
  const keyFor = ({chainTicker, updateId}) => `${chainTicker}:${updateId}`;

  for (const update of updates) {
    const key = keyFor(update);
    if (jobs.has(key)) continue;

    const channels = eligibleChannels(state, update.chainTicker, update.updateId);
    if (!channels.length) continue;

    jobs.set(key, {...update, channels});
  }

  const vrpcJobs = [...jobs.values()]
    .filter(job => [API_GET_BALANCES, API_GET_TRANSACTIONS].includes(job.updateId) &&
      job.channels.some(channel => channel.startsWith(`${VRPC}.`)));
  const vrpcRefresh = createVrpcRefresh(vrpcJobs, {isCurrent});
  const results = new Map();

  // Occupy each job and attach its consumers before executing the prepared plan.
  // Nothing waits for a queued RPC before execute(), which avoids a flush deadlock.
  for (const [key, job] of jobs) {
    results.set(key, updateWalletData(
      state,
      dispatch,
      job.channels,
      job.chainTicker,
      job.updateId,
      undefined,
      {vrpcRefresh},
    ).then(success => success ? API_SUCCESS : API_ERROR));
  }

  await vrpcRefresh.execute();

  return Promise.all(updates.map(update => results.get(keyFor(update)) || API_ABORTED));
};

export const conditionallyUpdateWallet = async (state, dispatch, chainTicker, updateId) => {
  const [result] = await conditionallyUpdateWallets(state, dispatch, [{chainTicker, updateId}]);
  return result;
};
