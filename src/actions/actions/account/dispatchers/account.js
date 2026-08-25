import { ADDRESS_BLOCKLIST_FROM_WEBSERVER, LOADING_ACCOUNT, VALIDATING_ACCOUNT } from "../../../../utils/constants/constants";
import { signIntoAuthenticatedAccount, signOut } from "../../../actionCreators";
import { COIN_MANAGER_MAP, fetchActiveCoins, setUserCoins } from "../../coins/Coins";
import {
  activateChainLifecycle,
  activateServiceLifecycle,
  captureLifecycleTimers,
  clearServiceIntervals,
  clearChainLifecycle,
} from "../../intervals/dispatchers/lifecycleManager";
import { initPersonalDataForUser } from "../../personal/dispatchers/personal";
import { setServiceStored } from "../../services/creators/services";
import { resetServices } from '../../services/dispatchers/services';
import { fetchUsers, validateLogin } from "../../UserData";
import { initSettings, saveGeneralSettings } from "../../WalletSettings";
import { DISABLED_CHANNELS } from '../../../../../env/index'
import store from "../../../../store";
import { getAddressBlocklistFromServer } from "../../../../utils/api/channels/general/addressBlocklist/getAddressBlocklist";
import {loadServiceStoredDataForUser} from '../../../../utils/asyncStore/serviceStoredDataStorage';
import {initSession} from '../../../../utils/auth/authBox';
import {removeSessionCredential} from '../../../../utils/keychain/keychain';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from "../../updates/sessionRequests";
import {DLIGHT_PRIVATE} from '../../../../utils/constants/intervalConstants';
import {
  clearDlightTeardownSeed,
  setDlightTeardownSeed,
  takeDlightTeardownSeed,
} from '../../../../utils/dlightTeardownSeed';

let accountInitializationSequence = 0;
let accountTeardownSequence = 0;
let accountTeardownQueue = Promise.resolve();
let accountResourceInitializationQueue = Promise.resolve();
let sessionCredentialQueue = Promise.resolve();
const pendingTimedOutTeardownOperations = new Set();

export const ACCOUNT_TEARDOWN_TIMEOUT_MS = 30000;

const beginAccountInitialization = () => ++accountInitializationSequence;

const cloneCoins = coins =>
  (coins || []).map(coin => ({
    ...coin,
    users: Array.isArray(coin.users) ? [...coin.users] : [],
  }));

const serializeSessionCredentialMutation = mutation => {
  const result = sessionCredentialQueue.then(mutation, mutation);
  sessionCredentialQueue = result.catch(() => {});
  return result;
};

const acquireAccountResourceInitialization = async () => {
  const previous = accountResourceInitializationQueue;
  let release;
  accountResourceInitializationQueue = new Promise(resolve => {
    release = resolve;
  });
  await previous;
  return release;
};

const settleTeardownOperation = (operation, label, teardownContext) =>
  new Promise((resolve, reject) => {
    const underlyingOperation = Promise.resolve(operation);
    pendingTimedOutTeardownOperations.add(underlyingOperation);
    underlyingOperation.then(
      () => pendingTimedOutTeardownOperations.delete(underlyingOperation),
      () => pendingTimedOutTeardownOperations.delete(underlyingOperation),
    );
    const timeoutId = setTimeout(() => {
      const error = new Error(`Timed out while closing ${label}.`);
      error.code = 'ACCOUNT_TEARDOWN_TIMEOUT';
      error.teardown = {
        teardownId: teardownContext.teardownId,
        ownerAccountHash: teardownContext.ownerAccountHash,
        label,
      };
      reject(error);
    }, ACCOUNT_TEARDOWN_TIMEOUT_MS);

    underlyingOperation.then(
      result => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

const initializeSessionCredential = (
  password,
  assertInitializationActive,
) =>
  serializeSessionCredentialMutation(async () => {
    assertInitializationActive();

    try {
      const sessionKey = await initSession(password);
      assertInitializationActive();
      return sessionKey;
    } catch (sessionError) {
      // Credential mutations are serialized, so removing a partially-written
      // credential here cannot erase a newer account's completed session.
      try {
        await removeSessionCredential();
      } catch (credentialError) {
        sessionError.credentialCleanupError = credentialError;
        console.warn(credentialError);
      }

      throw sessionError;
    }
  });

const clearInitializedSessionIfCurrent = sessionScope =>
  serializeSessionCredentialMutation(async () => {
    if (!sessionScopeIsCurrent(store.getState(), sessionScope)) return false;
    await removeSessionCredential();
    if (!sessionScopeIsCurrent(store.getState(), sessionScope)) return false;
    store.dispatch(signOut(sessionScope));
    return true;
  });

export const captureAccountTeardownContext = (options = {}) => {
  if (options?.teardown === true && options?.teardownId != null) {
    // A generic account context must never retain plaintext seed material.
    // `clearActiveAccountLifecycles` extracts legacy/private seed input before
    // asking this function to capture the public teardown snapshot.
    clearDlightTeardownSeed(options);
    delete options.account;
    return options;
  }

  const state = store.getState();
  const account = options.account || state.authentication.activeAccount;
  const ownerAccountHash =
    options.ownerAccountHash || account?.accountHash || null;
  const ownerAccountId = options.ownerAccountId || account?.id || null;
  const ownerIsActive =
    state.authentication.activeAccount != null &&
    state.authentication.activeAccount.accountHash === ownerAccountHash;
  const capturedTimers = ownerIsActive
    ? captureLifecycleTimers(state)
    : {coinUpdateIntervals: {}, serviceUpdateIntervals: {}};
  const activeCoinsForUser = cloneCoins(
    options.activeCoinsForUser ||
      (ownerIsActive
        ? state.coins.activeCoinsForUser
        : (state.coins.activeCoinList || []).filter(coin =>
            (coin.users || []).includes(ownerAccountId),
          )),
  );
  const sessionScope =
    options.sessionScope ||
    captureSessionScope(state, ownerAccountHash);
  const resourceOwnerScope = options.resourceOwnerScope || {
    accountHash: ownerAccountHash,
    sessionEpoch: sessionScope.sessionEpoch,
  };
  clearDlightTeardownSeed(options);
  const publicOptions = {...options};
  // `account` may contain encrypted keys/seeds and is only needed above to
  // derive stable owner fields; never forward the full record to closers.
  delete publicOptions.account;
  delete publicOptions.dlightSeed;

  return {
    ...publicOptions,
    teardown: true,
    teardownId:
      options.teardownId || `account-teardown-${++accountTeardownSequence}`,
    ownerAccountHash,
    ownerAccountId,
    sessionScope,
    resourceOwnerScope,
    activeCoinsForUser,
    lifecycleTimers: options.lifecycleTimers || capturedTimers,
    dlightSockets:
      options.dlightSockets ||
      (ownerIsActive
        ? {...(state.channelStore_dlight_private?.dlightSockets || {})}
        : {}),
    hasDlightSeed:
      options.hasDlightSeed == null
        ? account?.seeds?.dlight_private != null
        : options.hasDlightSeed,
    allowRetryPrompt: options.allowRetryPrompt === true,
    clearDb: options.clearDb === true,
  };
};

const runAccountTeardown = async (teardownContext, suppliedDlightSeed = null) => {
  const closerPromises = [];
  let dlightSeed = suppliedDlightSeed;

  try {
    teardownContext.activeCoinsForUser.forEach(coinObj => {
      (coinObj.compatible_channels || []).forEach(channel => {
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
              settleTeardownOperation(
                COIN_MANAGER_MAP.closers[channel](
                  coinObj,
                  teardownContext.clearDb,
                  closerContext,
                ),
                `${coinObj.id}:${channel}`,
                teardownContext,
              ),
            ),
          );
        }
      });
    });
  } finally {
    // Per-DLight contexts now own the only required references. The shared
    // account context and all non-DLight contexts remain secret-free.
    clearDlightTeardownSeed(teardownContext);
    suppliedDlightSeed = null;
    dlightSeed = null;
  }

  closerPromises.push(
    Promise.resolve().then(() =>
      settleTeardownOperation(
        resetServices(),
        'connected services',
        teardownContext,
      ),
    ),
  );

  const closerResults = await Promise.allSettled(closerPromises);
  // Timer IDs are part of the original account snapshot. Clear those exact
  // native timers even if another account is now active; scoped Redux cleanup
  // will be rejected when publication would target that newer account.
  teardownContext.activeCoinsForUser.forEach(coinObj => {
    clearChainLifecycle(
      coinObj.id,
      teardownContext.lifecycleTimers.coinUpdateIntervals[coinObj.id] || {},
      teardownContext.sessionScope,
    );
  });
  clearServiceIntervals(
    teardownContext.lifecycleTimers.serviceUpdateIntervals,
    teardownContext.sessionScope,
  );

  const failures = closerResults
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);

  if (failures.length > 0) {
    const error = new Error(
      `Failed to close ${failures.length} account wallet channel(s).`,
    );
    error.code = 'ACCOUNT_TEARDOWN_FAILED';
    error.failures = failures;
    error.teardown = {
      teardownId: teardownContext.teardownId,
      ownerAccountHash: teardownContext.ownerAccountHash,
      ownerAccountId: teardownContext.ownerAccountId,
      coinIds: teardownContext.activeCoinsForUser.map(coin => coin.id),
    };
    throw error;
  }

  return teardownContext;
};

export const awaitPendingAccountTeardowns = async () => {
  await accountTeardownQueue;
  if (pendingTimedOutTeardownOperations.size > 0) {
    const error = new Error(
      'A previous account teardown is still pending in native code.',
    );
    error.code = 'ACCOUNT_TEARDOWN_STILL_PENDING';
    throw error;
  }
};

export const initializeAccountData = async (
  account,
  password,
  makeDefault = false,
  setInitStep = () => {},
  initializationId = beginAccountInitialization(),
) => {
  const startingSessionScope = captureSessionScope(store.getState());
  const assertInitializationActive = () => {
    if (
      initializationId !== accountInitializationSequence ||
      !sessionScopeIsCurrent(store.getState(), startingSessionScope)
    ) {
      throw new Error('A newer account session replaced this account load.');
    }
  };

  setInitStep(VALIDATING_ACCOUNT);
  const accountAuthenticator = await validateLogin(account, password, true);
  assertInitializationActive();

  if (accountAuthenticator) {
    setInitStep(LOADING_ACCOUNT);
    const initialServiceStoredData = await loadServiceStoredDataForUser(
      account.accountHash,
    );
    assertInitializationActive();

    if (makeDefault) {
      await saveGeneralSettings({
        defaultAccount: account.accountHash,
      });
      assertInitializationActive();
    }

    const coinList = await fetchActiveCoins();
    assertInitializationActive();
    const setUserCoinsAction = setUserCoins(
      coinList.activeCoinList,
      account.id,
    );
    const {activeCoinsForUser} = setUserCoinsAction.payload;

    const settingsAction = await initSettings()
    assertInitializationActive();
    store.dispatch(settingsAction);

    try {
      const { addressBlocklist } = store.getState().settings.generalWalletSettings;

      const fetchedBlocklist = await getAddressBlocklistFromServer();
      assertInitializationActive();
      const currentBlocklist = [];

      for (const address of fetchedBlocklist) {
        currentBlocklist.unshift({ 
          address, 
          details: '', 
          lastModified: Math.floor(Date.now() / 1000) 
        });
      }

      const saveGeneralSettingsAction = await saveGeneralSettings({
        addressBlocklist: currentBlocklist
      });

      assertInitializationActive();
      store.dispatch(saveGeneralSettingsAction);
    } catch(e) {
      console.warn("Failed to fetch address blocklist");
      console.warn(e);
    }

    // Do not install B's process-wide credential while any captured A
    // teardown (or timed-out native continuation) can still mutate globals.
    await awaitPendingAccountTeardowns();
    assertInitializationActive();
    const sessionKey = await initializeSessionCredential(
      password,
      assertInitializationActive,
    );
    assertInitializationActive();
    store.dispatch({...accountAuthenticator, sessionKey});
    const sessionScope = captureSessionScope(
      store.getState(),
      account.accountHash,
    );
    const dispatchForAccount = action =>
      store.dispatch(scopeSessionAction(action, sessionScope));
    const assertSessionCurrent = () => {
      if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
        throw new Error('Account changed while account data was loading.');
      }
    };

    const initializationContext = {sessionScope};
    const rollbackContext = captureAccountTeardownContext({
      account,
      activeCoinsForUser,
      sessionScope,
    });
    const releaseResourceInitialization =
      await acquireAccountResourceInitialization();

    try {
      // A teardown can be queued while this login waits for an older account's
      // resource initialization/rollback mutex. Recheck after acquiring it so
      // a timed-out native continuation cannot race this account's setup.
      await awaitPendingAccountTeardowns();
      assertSessionCurrent();

      dispatchForAccount(setServiceStored(initialServiceStoredData));
      assertSessionCurrent();
      store.dispatch(scopeSessionAction(coinList, sessionScope));

      dispatchForAccount(setUserCoinsAction);

      for (let i = 0; i < activeCoinsForUser.length; i++) {
        const coinObj = activeCoinsForUser[i];

        const initializerResults = await Promise.allSettled(
          coinObj.compatible_channels.map(channel => {
            if (
              !DISABLED_CHANNELS.includes(channel) &&
              COIN_MANAGER_MAP.initializers[channel]
            ) {
              return COIN_MANAGER_MAP.initializers[channel](
                coinObj,
                initializationContext,
              );
            } else {
              return null;
            }
          }),
        );

        if (sessionScopeIsCurrent(store.getState(), sessionScope)) {
          rollbackContext.dlightSockets = {
            ...(store.getState().channelStore_dlight_private?.dlightSockets || {}),
          };
        }
        const initializerFailures = initializerResults
          .filter(result => result.status === 'rejected')
          .map(result => result.reason);
        if (initializerFailures.length > 0) {
          const error = new Error(
            `Failed to initialize ${initializerFailures.length} wallet channel(s) for ${coinObj.id}.`,
          );
          error.code = 'ACCOUNT_CHANNEL_INITIALIZATION_FAILED';
          error.failures = initializerFailures;
          throw error;
        }

        assertSessionCurrent();
        activateChainLifecycle(coinObj, activeCoinsForUser);
        rollbackContext.lifecycleTimers = captureLifecycleTimers(
          store.getState(),
        );
      }

      dispatchForAccount(setUserCoinsAction);

      assertSessionCurrent();
      activateServiceLifecycle();
      rollbackContext.lifecycleTimers = captureLifecycleTimers(
        store.getState(),
      );
      await initPersonalDataForUser(account.accountHash);
      assertSessionCurrent();
      dispatchForAccount(signIntoAuthenticatedAccount());
    } catch (initializationError) {
      try {
        await clearActiveAccountLifecycles(rollbackContext);
      } catch (rollbackError) {
        initializationError.rollbackError = rollbackError;
        console.warn(rollbackError);
      }

      try {
        await clearInitializedSessionIfCurrent(sessionScope);
      } catch (credentialCleanupError) {
        initializationError.credentialCleanupError = credentialCleanupError;
        console.warn(credentialCleanupError);
      }

      throw initializationError;
    } finally {
      releaseResourceInitialization();
    }
  } else {
    throw new Error(
      `Failed to validate and initialize account "${account.id}"`,
    );
  }
};


export const clearActiveAccountLifecycles = (
  options = {},
  suppliedDlightSeed = null,
) => {
  // Capture owner, resources, and timer IDs synchronously. A queued teardown
  // must never discover and close whatever account happens to be active later.
  let dlightSeed =
    suppliedDlightSeed == null
      ? takeDlightTeardownSeed(options)
      : suppliedDlightSeed;
  clearDlightTeardownSeed(options);
  const teardownContext = captureAccountTeardownContext(options);
  // This holder is intentionally separate from the generic teardown context.
  // It is consumed as soon as the serialized teardown starts, then only
  // DLight-specific closer contexts receive the secret.
  const dlightSecretHolder = {value: dlightSeed};
  suppliedDlightSeed = null;
  dlightSeed = null;
  const runCapturedTeardown = () => {
    let operationSeed = dlightSecretHolder.value;
    dlightSecretHolder.value = null;
    const operation = runAccountTeardown(teardownContext, operationSeed);
    operationSeed = null;
    return operation;
  };
  const result = accountTeardownQueue.then(
    runCapturedTeardown,
    runCapturedTeardown,
  );
  accountTeardownQueue = result.catch(() => {});
  return result;
};


export const refreshAccountData = async (
  accountHash,
  password,
  makeDefault = false,
  setInitStep = () => {}
) => {
  const initializationId = beginAccountInitialization();
  await clearActiveAccountLifecycles();
  store.dispatch(await fetchUsers())
  
  const newAccount = store
    .getState()
    .authentication.accounts.find(
      (account) => account.accountHash === accountHash
    );

  return await initializeAccountData(
    newAccount,
    password,
    makeDefault,
    setInitStep,
    initializationId,
  );
};
