import Store from '../../../../../store/index'
import {
  initializeWallet,
  eraseWallet,
  openWallet,
  closeWallet,
  getAddresses
} from '../../../../../utils/api/channels/dlight/callCreators'
import { isDlightSpendingKey } from '../../../../../utils/keys'
import { resolveSequentially } from '../../../../../utils/promises'
import { canRetryDlightInitialization, blockchainQuitError } from './AlertManager'
import {
  ERROR_DLIGHT_INIT,
  STOP_DLIGHT_SYNC,
  SET_ADDRESSES,
  CLOSE_DLIGHT_SOCKET,
  INIT_DLIGHT_CHANNEL_START,
  CLOSE_DLIGHT_CHANNEL,
} from "../../../../../utils/constants/storeType";
import { requestSeeds } from '../../../../../utils/auth/authBox'
import { DLIGHT_PRIVATE } from '../../../../../utils/constants/intervalConstants'
import {
  getContextActionScope,
  getContextSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../../updates/sessionRequests'
import {
  clearDlightTeardownSeed,
  takeDlightTeardownSeed,
} from '../../../../../utils/dlightTeardownSeed';

export const DLIGHT_TEARDOWN_TIMEOUT_MS = 30000;

// Native wallets survive React Native Fast Refresh. Keep their lifecycle
// coordinator outside this module instance so refreshed JS cannot forget an
// in-flight or failed operation and collide with the preserved native alias.
const DLIGHT_LIFECYCLE_COORDINATOR_KEY = Symbol.for(
  'verus.mobile.dlightLifecycleCoordinator.v1',
);
if (globalThis[DLIGHT_LIFECYCLE_COORDINATOR_KEY] == null) {
  globalThis[DLIGHT_LIFECYCLE_COORDINATOR_KEY] = {
    walletOperationGenerations: new Map(),
    pendingNativeInitializations: new Map(),
    pendingNativeTeardowns: new Map(),
    uncertainWalletTeardowns: new Set(),
  };
}
const {
  walletOperationGenerations,
  pendingNativeInitializations,
  pendingNativeTeardowns,
  uncertainWalletTeardowns,
} = globalThis[DLIGHT_LIFECYCLE_COORDINATOR_KEY];

const walletOperationKey = (accountHash, coinId) =>
  `${accountHash}:${coinId}`;

const beginWalletOperation = (accountHash, coinId, kind) => {
  const key = walletOperationKey(accountHash, coinId);
  const previous = walletOperationGenerations.get(key);
  const operation = {
    generation: (previous?.generation || 0) + 1,
    kind,
  };
  walletOperationGenerations.set(key, operation);
  return {key, operation};
};

const trackNativeTeardown = (walletKey, operation) => {
  const nativeTeardown = Promise.resolve(operation);
  pendingNativeTeardowns.set(walletKey, nativeTeardown);
  nativeTeardown.then(
    () => {
      uncertainWalletTeardowns.delete(walletKey);
      if (pendingNativeTeardowns.get(walletKey) === nativeTeardown) {
        pendingNativeTeardowns.delete(walletKey);
      }
    },
    () => {
      uncertainWalletTeardowns.add(walletKey);
      if (pendingNativeTeardowns.get(walletKey) === nativeTeardown) {
        pendingNativeTeardowns.delete(walletKey);
      }
    },
  );
  return nativeTeardown;
};

const trackNativeInitialization = (walletKey, operation) => {
  let records = pendingNativeInitializations.get(walletKey);
  if (records == null) {
    records = new Set();
    pendingNativeInitializations.set(walletKey, records);
  }

  let resolveCompletion;
  const completionPromise = new Promise(resolve => {
    resolveCompletion = resolve;
  });
  const record = {
    nativePromise: Promise.resolve(operation),
    completionPromise,
    complete: null,
  };
  let completed = false;
  record.complete = () => {
    if (completed) return;
    completed = true;
    records.delete(record);
    if (records.size === 0) {
      pendingNativeInitializations.delete(walletKey);
    }
    resolveCompletion();
  };
  records.add(record);
  return record;
};

const getPendingNativeInitializations = walletKey =>
  [...(pendingNativeInitializations.get(walletKey) || [])];

const withTimeout = (operation, timeoutMs, makeError) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(makeError());
    }, timeoutMs);

    Promise.resolve(operation).then(
      result => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(result);
      },
      error => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

const getSafeNativeErrorCode = cause => {
  const code = cause?.code;
  return typeof code === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(code)
    ? code
    : null;
};

const makeDlightCloseError = (
  code,
  coinId,
  accountHash,
  clearDb,
  cause,
) => {
  const action = clearDb ? 'erase' : 'close';
  const error = new Error(
    `Unable to ${action} ${coinId}'s light wallet for ${accountHash}.`,
  );
  error.name = 'DlightTeardownError';
  error.code = code;
  error.coinId = coinId;
  error.accountHash = accountHash;
  error.clearDb = clearDb;
  const nativeCode = getSafeNativeErrorCode(cause);
  if (nativeCode != null) error.nativeCode = nativeCode;
  return error;
};

const makeDlightInitError = (coinId, cause) => {
  const nativeCode = getSafeNativeErrorCode(cause);
  const error = new Error(`Unable to initialize ${coinId}'s light wallet.`);
  error.name = 'DlightInitializationError';
  error.code = nativeCode || 'DLIGHT_INITIALIZATION_FAILED';
  error.coinId = coinId;
  if (nativeCode != null) error.nativeCode = nativeCode;
  return error;
};

const makeDlightInitBlockedError = (code, coinId, accountHash) => {
  const error = makeDlightInitError(coinId);
  error.code = code;
  error.accountHash = accountHash;
  return error;
};

// Initializes dlight wallet by either creating a backend native wallet and opening it or just opening it
export const initDlightWallet = async (coinObj, requestContext = null) => {
  const { dispatch, getState } = Store
  const State = getState()

  const { settings, authentication, channelStore_dlight_private } = State
  const { dlightSockets, dlightSyncing } = channelStore_dlight_private
  const { activeAccount } = authentication
  const { accountHash } = activeAccount
  const { dlight_endpoints, id, proto } = coinObj
  const sessionScope = getContextSessionScope(
    State,
    requestContext,
    accountHash,
  )
  const walletKey = walletOperationKey(accountHash, id);

  if (pendingNativeTeardowns.has(walletKey)) {
    const error = makeDlightInitBlockedError(
      'DLIGHT_TEARDOWN_PENDING',
      id,
      accountHash,
    );
    dispatch(scopeSessionAction({
      type: ERROR_DLIGHT_INIT,
      payload: {chainTicker: id, error},
    }, sessionScope));
    throw error;
  }

  if (getPendingNativeInitializations(walletKey).length > 0) {
    const error = makeDlightInitBlockedError(
      'DLIGHT_INITIALIZATION_PENDING',
      id,
      accountHash,
    );
    dispatch(scopeSessionAction({
      type: ERROR_DLIGHT_INIT,
      payload: {chainTicker: id, error},
    }, sessionScope));
    throw error;
  }

  if (uncertainWalletTeardowns.has(walletKey)) {
    const error = makeDlightInitBlockedError(
      'DLIGHT_TEARDOWN_RECOVERY_REQUIRED',
      id,
      accountHash,
    );
    dispatch(scopeSessionAction({
      type: ERROR_DLIGHT_INIT,
      payload: {chainTicker: id, error},
    }, sessionScope));
    throw error;
  }

  const {operation: initializationOperation} =
    beginWalletOperation(accountHash, id, 'initialize');

  const initializationOperationIsCurrent = () =>
    walletOperationGenerations.get(walletKey)?.generation ===
      initializationOperation.generation &&
    walletOperationGenerations.get(walletKey)?.kind === 'initialize';

  const initializationMayContinue = () =>
    initializationOperationIsCurrent() &&
    sessionScopeIsCurrent(getState(), sessionScope);

  const dispatchScoped = action =>
    dispatch(scopeSessionAction(action, sessionScope));

  let capturedWalletMayBeOpen = false;
  let nativeInitializationRecord = null;

  const completeNativeInitialization = () => {
    if (nativeInitializationRecord == null) return;
    nativeInitializationRecord.complete();
    nativeInitializationRecord = null;
  };

  const closeCapturedWalletIfSafe = async () => {
    if (!capturedWalletMayBeOpen) return

    const currentOperation = walletOperationGenerations.get(walletKey);
    const mayCloseCapturedWallet =
      currentOperation?.generation === initializationOperation.generation ||
      (
        currentOperation?.generation > initializationOperation.generation &&
        currentOperation.kind === 'teardown'
      );
    if (!mayCloseCapturedWallet) return

    capturedWalletMayBeOpen = false
    const previousTeardown = pendingNativeTeardowns.get(walletKey);

    if (
      currentOperation.kind === 'teardown' &&
      previousTeardown != null
    ) {
      // The explicit teardown waits for this initializer's native promise,
      // performs the final close, and then waits for our completion signal.
      // Return now so this initializer can signal completion without forming
      // a teardown <-> initializer wait cycle.
      return;
    }

    const cleanupClose = trackNativeTeardown(
      walletKey,
      (async () => {
        // A teardown that started before the late initializer completed may
        // have closed an as-yet unopened alias. Let it settle, then perform
        // the final close. Keeping this whole cleanup registered blocks a
        // newer same-owner init from being closed by its late side effect.
        if (previousTeardown != null) {
          await Promise.allSettled([previousTeardown]);
        }
        return closeWallet(id, accountHash, proto);
      })(),
    );

    try {
      await withTimeout(
        cleanupClose,
        requestContext?.teardownTimeoutMs || DLIGHT_TEARDOWN_TIMEOUT_MS,
        () => makeDlightCloseError(
          'DLIGHT_TEARDOWN_TIMEOUT',
          id,
          accountHash,
          false,
        ),
      )
    } catch (cause) {
      console.warn(makeDlightCloseError(
        'DLIGHT_STALE_INITIALIZATION_CLEANUP_FAILED',
        id,
        accountHash,
        false,
        cause,
      ))
    }
  }

  try {
    if (
      activeAccount.keys[coinObj.id] == null ||
      activeAccount.keys[coinObj.id].dlight_private == null
    )
      return Promise.resolve();

  // Depends on settings already being added to redux store and initialized
  let initializationPromises = []

  try {
    if (dlightSyncing[id])
      throw new Error(
        "Something went wrong while initializing " +
          id +
          ". It is marked as already syncing, before it has been added!?"
      );

    if (dlightSockets[id] == null) {
      if (dlight_endpoints == null || !Array.isArray(dlight_endpoints) || dlight_endpoints.length === 0)
        throw new Error(id + " has been requested as a lightwallet client, but it has no servers!")

      const lightWalletEndpointArr = dlight_endpoints[0].split(':')

      if (lightWalletEndpointArr[1] == null || isNaN(lightWalletEndpointArr[1])) 
        throw new Error(id + " lightwallet was requested with port " + lightWalletEndpointArr[1], " this is not a valid port.")

      const seed = (await requestSeeds())[DLIGHT_PRIVATE];
      if (!initializationMayContinue()) return

      let mnemonicSeed = "";
      let extsk = "";

      if (isDlightSpendingKey(seed)) {
        extsk = seed;
      } else {
        mnemonicSeed = seed;
      }

      capturedWalletMayBeOpen = true
      nativeInitializationRecord = trackNativeInitialization(
        walletKey,
        withTimeout(Promise.resolve().then(() =>
          initializeWallet(
            id,
            proto,
            accountHash,
            lightWalletEndpointArr[0],
            Number(lightWalletEndpointArr[1]),
            mnemonicSeed,
            extsk,
          ),
        ), DLIGHT_TEARDOWN_TIMEOUT_MS, makeDlightInitError(coinObj.id, new Error("Timed out while initializing dlight wallet"))),
      );
      const initializedWallet =
        await nativeInitializationRecord.nativePromise;
      if (!initializationMayContinue()) {
        await closeCapturedWalletIfSafe()
        return
      }

      initializationPromises = [
        initializedWallet,
        getAddresses(extsk, mnemonicSeed, id),
      ];

    } else if (dlightSockets[id] === false) {
      const lightWalletEndpointArr = dlight_endpoints[0].split(':')

      if (lightWalletEndpointArr[1] == null || isNaN(lightWalletEndpointArr[1]))
        throw new Error(id + " lightwallet was requested with port " + lightWalletEndpointArr[1], " this is not a valid port.")

      const seed = (await requestSeeds())[DLIGHT_PRIVATE];
      if (!initializationMayContinue()) return

      let mnemonicSeed = "";
      let extsk = "";

      if (isDlightSpendingKey(seed)) {
        extsk = seed;
      } else {
        mnemonicSeed = seed;
      }

      capturedWalletMayBeOpen = true
      nativeInitializationRecord = trackNativeInitialization(
        walletKey,
        Promise.resolve().then(() =>
          openWallet(
            id,
            proto,
            accountHash,
            lightWalletEndpointArr[0],
            Number(lightWalletEndpointArr[1]),
            mnemonicSeed,
            extsk,
          ),
        ),
      );
      const openedWallet = await nativeInitializationRecord.nativePromise;
      if (!initializationMayContinue()) {
        await closeCapturedWalletIfSafe()
        return
      }

      initializationPromises = [
        openedWallet,
        getAddresses(extsk, mnemonicSeed, id),
      ]
    } else {
      throw new Error(id + " is already initialized and connected in lightwalletd mode. Cannot intialize and connect a coin twice.")
    }
  } catch (e) {
    const initError = makeDlightInitError(id, e);
    console.warn(initError)

    if (!initializationMayContinue()) {
      await closeCapturedWalletIfSafe()
      return
    }

    dispatchScoped({
      type: ERROR_DLIGHT_INIT,
      payload: { chainTicker: id, error: initError }
    })
  }

  return await new Promise((resolve) => {
    resolveSequentially(initializationPromises)
    .then(res => {
      if (!initializationMayContinue()) {
        closeCapturedWalletIfSafe().then(resolve)
        return
      }

      dispatchScoped({
        type: INIT_DLIGHT_CHANNEL_START,
        payload: { chainTicker: id }
      })

      dispatchScoped({
        type: SET_ADDRESSES,
        payload: { chainTicker: id, channel: DLIGHT_PRIVATE, addresses: [ res.pop().result ]  }
      });

      resolve()
    })
    .catch(err => {
      const initError = makeDlightInitError(id, err);
      console.warn(initError)

      if (!initializationMayContinue()) {
        closeCapturedWalletIfSafe().then(resolve)
        return
      }

      canRetryDlightInitialization(id)
      .then(async canRetry => {
        if (!initializationMayContinue()) {
          closeCapturedWalletIfSafe().then(resolve)
          return
        }

        if (canRetry) {
          await closeCapturedWalletIfSafe();
          completeNativeInitialization();
          return initDlightWallet(coinObj, requestContext).then(resolve)
        } else {
          await closeCapturedWalletIfSafe();
          dispatchScoped({
            type: ERROR_DLIGHT_INIT,
            payload: { chainTicker: id, error: initError }
          })

          resolve()
        }
      })
      .catch(e => {
        if (!initializationMayContinue()) {
          closeCapturedWalletIfSafe().then(resolve)
          return
        }

        const initError = makeDlightInitError(id, e);
        dispatchScoped({
          type: ERROR_DLIGHT_INIT,
          payload: { chainTicker: id, error: initError }
        })

        resolve()
      })
    })
  })
  } finally {
    completeNativeInitialization();
  }
}

// Closes and optionally deletes a dlightWallet
export const closeDlightWallet = async (
  coinObj,
  clearDb = false,
  requestContext = null,
) => {
  let capturedDlightSeed = null;
  try {
    const { dispatch, getState } = Store
    const State = getState()

    const { channelStore_dlight_private, authentication } = State
    const { dlightSockets } = channelStore_dlight_private
    const { activeAccount } = authentication
    const { id, proto } = coinObj
    const accountHash =
      requestContext?.ownerAccountHash || activeAccount?.accountHash;

    if (accountHash == null) {
      throw makeDlightCloseError(
        'DLIGHT_TEARDOWN_OWNER_MISSING',
        id,
        accountHash,
        clearDb,
      );
    }

    const nativeTeardownKey = walletOperationKey(accountHash, id);
    if (pendingNativeTeardowns.has(nativeTeardownKey)) {
      throw makeDlightCloseError(
        'DLIGHT_TEARDOWN_PENDING',
        id,
        accountHash,
        clearDb,
      );
    }

    const {operation: teardownOperation} =
      beginWalletOperation(accountHash, id, 'teardown');
    const pendingInitializations =
      getPendingNativeInitializations(nativeTeardownKey);
    const sessionScope = getContextActionScope(
      State,
      requestContext,
      accountHash,
    )
    const dispatchScoped = action =>
      dispatch(scopeSessionAction(action, sessionScope))
    const capturedSocketState =
      requestContext?.dlightSockets != null
        ? requestContext.dlightSockets[id]
        : dlightSockets[id];
    if (clearDb && capturedSocketState !== true) {
      capturedDlightSeed = takeDlightTeardownSeed(requestContext);
    } else {
      clearDlightTeardownSeed(requestContext);
    }
    const timeoutMs =
      requestContext?.teardownTimeoutMs || DLIGHT_TEARDOWN_TIMEOUT_MS;
    const allowRetryPrompt =
      requestContext == null || requestContext.allowRetryPrompt === true;
    let teardownWalletIsOpen = capturedSocketState === true;

    const publishClosed = () => {
      dispatchScoped({
        type: CLOSE_DLIGHT_SOCKET,
        payload: { chainTicker: id }
      })
      dispatchScoped({
        type: STOP_DLIGHT_SYNC,
        payload: { chainTicker: id }
      })
      dispatchScoped({
        type: CLOSE_DLIGHT_CHANNEL,
        payload: { chainTicker: id }
      })
    };

    if (
      !clearDb &&
      capturedSocketState !== true &&
      pendingInitializations.length === 0 &&
      !uncertainWalletTeardowns.has(nativeTeardownKey)
    ) {
      publishClosed();
      return {
        status: 'not_open',
        accountHash,
        coinId: id,
        clearDb,
      };
    }

    if (
      clearDb &&
      requestContext?.hasDlightSeed === false &&
      capturedDlightSeed == null &&
      capturedSocketState !== true &&
      pendingInitializations.length === 0 &&
      !uncertainWalletTeardowns.has(nativeTeardownKey)
    ) {
      // A DLight-compatible coin does not prove that this profile ever owned a
      // native light wallet. Without either the profile's DLight seed, an open
      // socket, or an in-flight native operation, there is no wallet context to
      // open and erase. Avoid guessing at another native database while still
      // publishing the captured account's channel as closed.
      publishClosed();
      return {
        status: 'not_owned',
        accountHash,
        coinId: id,
        clearDb,
      };
    }

    while (true) {
      try {
        const nativeClose = (async () => {
          // A native initialize/open may resolve after Redux still reports the
          // socket as closed. Wait every captured native attempt, then make this
          // teardown's close/erase the final operation on the wallet alias.
          if (pendingInitializations.length > 0) {
            const initializationResults = await Promise.allSettled(
              pendingInitializations.map(record => record.nativePromise),
            );
            teardownWalletIsOpen = initializationResults.some(
              result => result.status === 'fulfilled',
            );
            if (teardownWalletIsOpen) capturedDlightSeed = null;
          }

          if (
            clearDb &&
            !teardownWalletIsOpen
          ) {
            let seed = capturedDlightSeed;
            const endpoint = coinObj.dlight_endpoints?.[0];
            const endpointParts = endpoint?.split(':') || [];
            if (
              seed == null ||
              endpointParts[0] == null ||
              endpointParts[1] == null ||
              isNaN(endpointParts[1])
            ) {
              throw makeDlightCloseError(
                'DLIGHT_ERASE_REQUIRES_WALLET_CONTEXT',
                id,
                accountHash,
                clearDb,
              );
            }

            let spendingKey = isDlightSpendingKey(seed) ? seed : '';
            let mnemonicSeed = spendingKey ? '' : seed;
            let openingWallet;
            try {
              openingWallet = openWallet(
                id,
                proto,
                accountHash,
                endpointParts[0],
                Number(endpointParts[1]),
                mnemonicSeed,
                spendingKey,
              );
            } finally {
              // The native bridge now owns its argument. Drop every additional
              // JS reference before awaiting an operation that may hang.
              capturedDlightSeed = null;
              seed = null;
              mnemonicSeed = null;
              spendingKey = null;
            }
            await openingWallet;
            teardownWalletIsOpen = true;
          }

          const closeResult = await (clearDb
            ? eraseWallet(id, accountHash, proto)
            : closeWallet(id, accountHash, proto));

          // A stale initializer can still be unwinding address loading and its
          // cleanup branch after the native open resolves. Keep teardown (and
          // therefore replacement initialization) pending until every captured
          // initializer has fully exited.
          if (pendingInitializations.length > 0) {
            await Promise.all(
              pendingInitializations.map(record => record.completionPromise),
            );
          }
          return closeResult;
        })();
        trackNativeTeardown(nativeTeardownKey, nativeClose);
        await withTimeout(nativeClose, timeoutMs, () =>
          makeDlightCloseError(
            'DLIGHT_TEARDOWN_TIMEOUT',
            id,
            accountHash,
            clearDb,
          ),
        );

        publishClosed();
        return {
          status: clearDb ? 'erased' : 'closed',
          accountHash,
          coinId: id,
          clearDb,
        };
      } catch (cause) {
        const error =
          cause?.code === 'DLIGHT_TEARDOWN_TIMEOUT'
            ? cause
            : makeDlightCloseError(
                'DLIGHT_TEARDOWN_FAILED',
                id,
                accountHash,
                clearDb,
                cause,
              );

        if (error.code === 'DLIGHT_TEARDOWN_TIMEOUT') throw error;
        if (!allowRetryPrompt) throw error;

        const canRetry = await blockchainQuitError(id);
        if (!canRetry) throw error;
        const currentOperation = walletOperationGenerations.get(
          nativeTeardownKey,
        );
        if (
          currentOperation?.generation !== teardownOperation.generation ||
          currentOperation.kind !== 'teardown'
        ) {
          throw makeDlightCloseError(
            'DLIGHT_TEARDOWN_SUPERSEDED',
            id,
            accountHash,
            clearDb,
          );
        }
        // Retry the exact same owner/action. In particular, an erase retry must
        // never silently degrade into the historical close-only call.
      }
    }
  } finally {
    // On timeout the underlying native promise may remain pending. Clearing
    // this mutable binding prevents that continuation from retaining the
    // plaintext seed in the JS heap indefinitely; a late fallback erase will
    // fail closed and require a fresh authenticated retry.
    capturedDlightSeed = null;
    clearDlightTeardownSeed(requestContext);
  }
}
