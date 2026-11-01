import Store from '../../../../store';
import {conditionallyUpdateWallets} from '../../wallet/dispatchers/WalletUpdates';
import {sessionScopeIsCurrent} from '../../updates/sessionRequests';

const groups = new Map();
const registrations = new Map();
const HANDLE_PREFIX = 'wallet-refresh:';
let sequence = 0;

/**
 * Balances and transactions with the same cadence share one clock. Registrations
 * have their own handles so removing a coin (or clearing an old session's timers)
 * cannot stop another coin's polling. Other update types keep their native timers.
 */
export const createWalletRefreshInterval = (
  interval,
  chainTicker,
  updateId,
  onComplete,
  sessionScope,
) => {
  const groupKey = JSON.stringify([sessionScope.accountHash, sessionScope.sessionEpoch, interval]);
  let group = groups.get(groupKey);

  if (!group) {
    group = {entries: new Map(), initial: null, interval: null};

    group.run = async () => {
      if (!sessionScopeIsCurrent(Store.getState(), sessionScope)) {
        for (const handle of group.entries.keys()) clearWalletRefreshInterval(handle);
        return;
      }

      const entries = [...group.entries.values()];

      try {
        await conditionallyUpdateWallets(Store.getState(), Store.dispatch, entries);

        if (!sessionScopeIsCurrent(Store.getState(), sessionScope)) return;

        for (const entry of entries) {
          if (group.entries.has(entry.handle) && entry.onComplete) {
            entry.onComplete(Store.getState(), Store.dispatch, entry.chainTicker);
          }
        }
      } catch (error) {
        console.warn(error);
      }
    };

    group.interval = setInterval(group.run, interval);
    groups.set(groupKey, group);
  }

  const handle = `${HANDLE_PREFIX}${++sequence}`;
  group.entries.set(handle, {handle, chainTicker, updateId, onComplete});
  registrations.set(handle, {groupKey, group});

  // Finish synchronous lifecycle registration before the initial refresh. This
  // is a scheduling boundary, not a timed window for collecting network calls.
  if (group.initial == null) {
    group.initial = setTimeout(() => {
      group.initial = null;
      group.run();
    }, 0);
  }

  return handle;
};

export const clearWalletRefreshInterval = handle => {
  if (typeof handle !== 'string' || !handle.startsWith(HANDLE_PREFIX)) return false;

  const registration = registrations.get(handle);
  if (!registration) return true;

  const {groupKey, group} = registration;
  registrations.delete(handle);
  group.entries.delete(handle);

  if (!group.entries.size) {
    clearInterval(group.interval);
    clearTimeout(group.initial);
    groups.delete(groupKey);
  }

  return true;
};
