import { 
  setCoinList,
  setCurrentUserCoins,
 } from '../../actionCreators';
import {
  storeCoins,
  getActiveCoinList,
  awaitCoinStorageMutations,
  queueCoinStorageMutation,
} from '../../../utils/asyncStore/asyncStore';
import {
  DLIGHT_PRIVATE,
  ETH,
  ERC20,
  ELECTRUM,
  GENERAL,
  WYRE_SERVICE,
  VRPC,
  VERUSID
} from "../../../utils/constants/intervalConstants";
import { initDlightWallet, closeDlightWallet } from '../channels/dlight/dispatchers/LightWalletReduxManager';
import { initEthWallet, closeEthWallet } from '../channels/eth/dispatchers/EthWalletReduxManager';
import { initErc20Wallet, closeErc20Wallet } from '../channels/erc20/dispatchers/Erc20WalletReduxManager';
import { initElectrumWallet, closeElectrumWallet } from '../channels/electrum/dispatchers/ElectrumWalletReduxManager';
import { initGeneralWallet, closeGeneralWallet } from '../channels/general/dispatchers/GeneralWalletReduxManager';
import { closeVrpcWallet, initVrpcWallet } from '../channels/vrpc/dispatchers/VrpcWalletReduxManager';
import { DISABLED_CHANNELS } from '../../../../env/index'
import store from '../../../store';
import {
  closeWyreCoinWallet,
  initWyreCoinChannel,
} from "../channels/wyre/dispatchers/WyreWalletReduxManager";
import { closeVerusIdWallet, initVerusIdWallet } from '../channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../updates/sessionRequests';
import {
  captureLifecycleIntervalIds,
  clearAllCoinIntervals,
  clearAllServiceIntervals,
} from '../intervals/dispatchers/IntervalCreator';
import {requestSeeds} from '../../../utils/auth/authBox';
import {
  clearDlightTeardownSeed,
  setDlightTeardownSeed,
  takeDlightTeardownSeed,
} from '../../../utils/dlightTeardownSeed';

let coinTeardownSequence = 0;
const COIN_TEARDOWN_TIMEOUT_MS = 30000;

const cloneCoinList = coinList =>
  (coinList || []).map(coin => ({
    ...coin,
    users: Array.isArray(coin.users) ? [...coin.users] : [],
  }));

const getRequestSessionScope = requestContext =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null) ||
  captureSessionScope(store.getState());

const assertRequestSessionCurrent = (sessionScope, requestContext) => {
  if (
    requestContext?.signal?.aborted === true ||
    !sessionScopeIsCurrent(store.getState(), sessionScope)
  ) {
    const error = new Error('Account changed while a wallet coin was being added.');
    error.code = 'SESSION_CHANGED';
    throw error;
  }
};

export const COIN_MANAGER_MAP = {
  initializers: {
    [ETH]: initEthWallet,
    [ERC20]: initErc20Wallet,
    [VRPC]: initVrpcWallet,
    [VERUSID]: initVerusIdWallet,
    [ELECTRUM]: initElectrumWallet,
    [DLIGHT_PRIVATE]: initDlightWallet,
    [GENERAL]: initGeneralWallet,
    [WYRE_SERVICE]: initWyreCoinChannel
  },
  closers: {
    [ETH]: closeEthWallet,
    [ERC20]: closeErc20Wallet,
    [VRPC]: closeVrpcWallet,
    [VERUSID]: closeVerusIdWallet,
    [ELECTRUM]: closeElectrumWallet,
    [DLIGHT_PRIVATE]: closeDlightWallet,
    [GENERAL]: closeGeneralWallet,
    [WYRE_SERVICE]: closeWyreCoinWallet
  }
}

// Add coin by saving it to localstorage, and optionally intialize dlight backend
export const addCoin = (
  fullCoinObj,
  activeCoins,
  userName,
  channels,
  requestContext = null,
) => {
  const sessionScope = getRequestSessionScope(requestContext);
  const initializerContext = {...(requestContext || {}), sessionScope};
  const assertCurrent = () =>
    assertRequestSessionCurrent(sessionScope, requestContext);
  assertCurrent();

  return queueCoinStorageMutation(async () => {
    // The caller's list is only a render-time snapshot. Always base a mutation
    // on the latest encrypted value so concurrent add/remove operations cannot
    // overwrite each other, and never mutate either snapshot in place.
    assertCurrent();
    const storedCoins = cloneCoinList(await getActiveCoinList());
    assertCurrent();
    const coinIndex = storedCoins.findIndex(x => x.id === fullCoinObj.id);
    let nextCoins;

    if (coinIndex > -1) {
      nextCoins = storedCoins.map((coin, index) => {
        if (index !== coinIndex || coin.users.includes(userName)) return coin;
        return {...coin, users: [...coin.users, userName]};
      });
    } else {
      nextCoins = [
        ...storedCoins,
        {...fullCoinObj, users: [userName]},
      ];
    }

    if (
      coinIndex < 0 ||
      !storedCoins[coinIndex].users.includes(userName)
    ) {
      await storeCoins(nextCoins);
    }

    assertCurrent();
    const initializers = Object.keys(COIN_MANAGER_MAP.initializers)
      .filter(channel => channels.includes(channel))
      .map(channel =>
        COIN_MANAGER_MAP.initializers[channel](
          fullCoinObj,
          initializerContext,
        ),
      );
    await Promise.all(initializers);
    assertCurrent();

    return scopeSessionAction(setCoinList(nextCoins), sessionScope);
  });
}

// Remove a user's name from an active coin, or removes from all if coinID is 
// null
export const removeExistingCoin = async (
  coinID,
  userName,
  dispatch,
  deleteWallet = false,
  requestContext = null,
) => {
  const state = store.getState();
  const activeAccount = state.authentication.activeAccount;
  const ownerAccount =
    activeAccount?.id === userName
      ? activeAccount
      : (state.authentication.accounts || []).find(
          account => account.id === userName,
        );
  const ownerAccountHash =
    requestContext?.ownerAccountHash || ownerAccount?.accountHash || null;
  const sessionScope =
    requestContext?.sessionScope ||
    (requestContext?.sessionScoped ? requestContext : null) ||
    captureSessionScope(state, ownerAccountHash);
  const ownerIsActive =
    activeAccount != null &&
    (ownerAccountHash == null
      ? activeAccount.id === userName
      : activeAccount.accountHash === ownerAccountHash);
  let suppliedDlightSeed = takeDlightTeardownSeed(requestContext);
  const publicRequestContext = {...(requestContext || {})};
  delete publicRequestContext.dlightSeed;
  const teardownContext = {
    ...publicRequestContext,
    teardown: true,
    teardownTimeoutMs:
      requestContext?.teardownTimeoutMs || COIN_TEARDOWN_TIMEOUT_MS,
    teardownId:
      requestContext?.teardownId || `coin-teardown-${++coinTeardownSequence}`,
    ownerAccountHash,
    ownerAccountId: userName,
    sessionScope,
    resourceOwnerScope: requestContext?.resourceOwnerScope || sessionScope,
    dlightSockets:
      requestContext?.dlightSockets ||
      (ownerIsActive
        ? {...(state.channelStore_dlight_private?.dlightSockets || {})}
        : {}),
    hasDlightSeed:
      requestContext?.hasDlightSeed == null
        ? ownerAccount?.seeds?.[DLIGHT_PRIVATE] != null
        : requestContext.hasDlightSeed,
    allowRetryPrompt: requestContext?.allowRetryPrompt === true,
    lifecycleTimers:
      requestContext?.lifecycleTimers ||
      (ownerIsActive
        ? captureLifecycleIntervalIds(state)
        : {coinUpdateIntervals: {}, serviceUpdateIntervals: {}}),
  };
  // Keep secret state out of the generic context while this mutation waits
  // for the shared storage queue. The holder is consumed at operation start.
  const dlightSecretHolder = {value: suppliedDlightSeed};
  suppliedDlightSeed = null;

  return queueCoinStorageMutation(async () => {
    let dlightSeed = dlightSecretHolder.value;
    dlightSecretHolder.value = null;
    try {
      const storedCoins = cloneCoinList(await getActiveCoinList());
      const matchingCoins = storedCoins.filter(
        coin =>
          (coinID == null || coin.id === coinID) &&
          coin.users.includes(userName),
      );

      if (matchingCoins.length === 0) return storedCoins;
      const needsDlightErase =
        deleteWallet &&
        matchingCoins.some(coin =>
          (coin.compatible_channels || []).includes(DLIGHT_PRIVATE),
        );

      if (
        needsDlightErase &&
        dlightSeed == null &&
        ownerIsActive &&
        ownerAccount?.seeds?.[DLIGHT_PRIVATE] != null
      ) {
        if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
          const error = new Error(
            'Account changed while preparing to erase a light wallet.',
          );
          error.code = 'SESSION_CHANGED';
          throw error;
        }
        dlightSeed = (await requestSeeds())[DLIGHT_PRIVATE];
        if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
          dlightSeed = null;
          const error = new Error(
            'Account changed while preparing to erase a light wallet.',
          );
          error.code = 'SESSION_CHANGED';
          throw error;
        }
      }

      if (requestContext?.skipTeardown !== true) {
        const closerPromises = [];
        matchingCoins.forEach(coin => {
          (coin.compatible_channels || []).forEach(channel => {
            if (
              !DISABLED_CHANNELS.includes(channel) &&
              COIN_MANAGER_MAP.closers[channel]
            ) {
              const closerContext = {...teardownContext};
              if (channel === DLIGHT_PRIVATE) {
                setDlightTeardownSeed(closerContext, dlightSeed);
              }
              closerPromises.push(
                Promise.resolve().then(() =>
                  COIN_MANAGER_MAP.closers[channel](
                    coin,
                    deleteWallet,
                    closerContext,
                  ),
                ),
              );
            }
          });
        });
        dlightSeed = null;

        const closerResults = await Promise.allSettled(closerPromises);
        matchingCoins.forEach(coin => {
          clearAllCoinIntervals(
            coin.id,
            teardownContext.lifecycleTimers.coinUpdateIntervals[coin.id] || {},
            teardownContext.sessionScope,
          );
        });
        if (coinID == null) {
          clearAllServiceIntervals(
            teardownContext.lifecycleTimers.serviceUpdateIntervals,
            teardownContext.sessionScope,
          );
        }
        const failures = closerResults
          .filter(
            result =>
              result.status === 'rejected' &&
              result.reason?.code !== 'CHANNEL_CLOSE_TIMEOUT',
          )
          .map(result => result.reason);

        if (failures.length > 0) {
          const error = new Error(
            `Failed to close ${failures.length} wallet channel(s) for ${userName}.`,
          );
          error.code = 'COIN_TEARDOWN_FAILED';
          error.failures = failures;
          error.teardown = {
            teardownId: teardownContext.teardownId,
            ownerAccountHash: teardownContext.ownerAccountHash,
            ownerAccountId: teardownContext.ownerAccountId,
            coinIds: matchingCoins.map(coin => coin.id),
          };
          throw error;
        }
      }

      const nextCoins = storedCoins.map(coin => {
        if (coinID != null && coin.id !== coinID) return coin;
        if (!coin.users.includes(userName)) return coin;
        return {
          ...coin,
          users: coin.users.filter(name => name !== userName),
        };
      });

      await storeCoins(nextCoins);
      const action = scopeSessionAction(setCoinList(nextCoins), sessionScope);
      if (dispatch) dispatch(action);
      return nextCoins;
    } finally {
      dlightSecretHolder.value = null;
      dlightSeed = null;
      clearDlightTeardownSeed(teardownContext);
    }
  });
}

export const fetchActiveCoins = () =>
  awaitCoinStorageMutations().then(() => getActiveCoinList()).then(setCoinList);

export const setUserCoins = (activeCoinList, userName) => {
  let result = [];

  for (let i = 0; i < activeCoinList.length; i++) {
    if (activeCoinList[i].users.includes(userName)) {
      result.push(activeCoinList[i]);
    }
  }

  return setCurrentUserCoins(result);
}
