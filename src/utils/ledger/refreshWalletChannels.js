import Store from '../../store';
import {conditionallyUpdateWallets} from '../../actions/actionDispatchers';
import {API_ABORTED} from '../constants/intervalConstants';

export const VISIBLE_WALLET_REFRESH_INTERVAL = 15000;
// Shorter than the timer, so a read that a balance change starts between two
// ticks does not make the next tick skip its read.
const VISIBLE_WALLET_READ_LIMIT = 10000;
let currentSession;
const lastReads = new Map();

// Visible surfaces can request fresh data without expiring every card. Share
// the 10-second limit across history, the address sheet and the VerusID list.
// A pull by the user (`force`) skips the time limit, never the busy check.
export const refreshWalletChannels = (chainTicker, cards, updateIds, {force = false} = {}) => {
  const state = Store.getState();
  const accountHash = state.authentication.activeAccount?.accountHash;
  if (!accountHash) return Promise.resolve(updateIds.map(() => API_ABORTED));

  const session = `${accountHash}:${state.authentication.sessionEpoch || 0}`;
  if (session !== currentSession) {
    lastReads.clear();
    currentSession = session;
  }

  const now = Date.now();
  const updates = updateIds.map(updateId => {
    const tracker = state.updates.coinUpdateTracker[chainTicker]?.[updateId];
    const {activeCoin, activeSection, coinMenuFocused} = state.coins;
    const visible = (!tracker?.coin_bound || (coinMenuFocused && activeCoin?.id === chainTicker)) &&
      (tracker?.update_locations == null || (coinMenuFocused && tracker.update_locations.includes(activeSection?.key)));
    const channels = [...new Set(cards.map(card => card?.api_channels?.[updateId]))]
      .filter(channel => {
        if (!visible || !channel || !tracker?.channels?.includes(channel) || tracker.busy?.[channel] ||
            !state[`channelStore_${channel.split('.')[0]}`]?.openCoinChannels[chainTicker]) return false;
        const key = `${chainTicker}:${updateId}:${channel}`;
        if (!force && lastReads.has(key) && now - lastReads.get(key) < VISIBLE_WALLET_READ_LIMIT) return false;
        lastReads.set(key, now);
        return true;
      });
    return {chainTicker, updateId, channels};
  });

  return conditionallyUpdateWallets(state, Store.dispatch, updates);
};
