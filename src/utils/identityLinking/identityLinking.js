import {
  I_ADDR_VERSION,
  R_ADDR_VERSION,
  fromBase58Check,
} from 'verus-typescript-primitives';
import store from '../../store';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import { linkVerusId } from '../../actions/actions/services/dispatchers/verusid/verusid';
import { CoinDirectory } from '../CoinData/CoinDirectory';
import { coinsList } from '../CoinData/CoinsList';
import VrpcProvider from '../vrpc/vrpcInterface';
import { requestServiceStoredData } from '../auth/authBox';
import { VERUSID_SERVICE_ID } from '../constants/services';
import { SET_WATCHED_VERUSIDS } from '../constants/storeType';
import { convertFqnToDisplayFormat } from '../fullyqualifiedname';
import { getIdentity } from '../api/channels/verusid/requests/getIdentity';

// Bind saved links to the wallet context and original rows that produced them.
const contexts = new WeakMap();
const discoveredRows = new WeakMap();

const fail = (code, message) => Object.assign(new Error(message), { code });
const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const hasAddressVersion = (address, version) => {
  try {
    const decoded = fromBase58Check(address);

    return decoded.version === version && decoded.hash.length === 20;
  } catch (_) {
    return false;
  }
};

const walletAddresses = (state, chain) => [
  ...new Set(
    (state.authentication.activeAccount?.keys?.[chain]?.vrpc?.addresses || [])
      .filter(address => hasAddressVersion(address, R_ADDR_VERSION)),
  ),
];

const accountIsTestnet = state =>
  Object.keys(state.authentication.activeAccount?.testnetOverrides || {}).length > 0;

// Recheck after asynchronous work so an account, network, or key change stops
// the old operation before it can save links or refresh the new wallet.
const assertCurrent = context => {
  const state = store.getState();
  const record = contexts.get(context);

  if (
    !record ||
    !context.sessionScope.accountHash ||
    !sessionScopeIsCurrent(state, context.sessionScope) ||
    accountIsTestnet(state) !== context.isTestnet ||
    JSON.stringify(walletAddresses(state, context.chain)) !==
      JSON.stringify(context.walletAddresses)
  ) {
    throw fail(
      'SESSION_CHANGED',
      'Wallet changed. Open Link identities again in the intended account.',
    );
  }

  return record;
};

/** Bind discovery and every subsequent saved link to this wallet and network. */
export const captureIdentityLinkContext = chain => {
  const state = store.getState();
  const isTestnet = accountIsTestnet(state);
  const requestedChain =
    (typeof chain === 'string' ? chain : chain?.id) ||
    (isTestnet ? 'VRSCTEST' : 'VRSC');

  let coin = (state.coins.activeCoinsForUser || []).find(candidate =>
    (candidate.id === requestedChain || candidate.system_id === requestedChain) &&
    candidate.currency_id === candidate.system_id,
  );

  if (!coin) {
    coin = CoinDirectory.findCoinObj(requestedChain);
  }

  if (
    !coin?.system_id ||
    coin.currency_id !== coin.system_id ||
    !!coin.testnet !== isTestnet
  ) {
    throw new Error('Choose an identity network for this wallet.');
  }

  const addresses = walletAddresses(state, coin.id);

  if (!addresses.length) {
    throw new Error('Add this network’s transparent wallet before linking identities.');
  }

  const context = Object.freeze({
    sessionScope: Object.freeze(captureSessionScope(state)),
    chain: coin.id,
    systemId: coin.system_id,
    networkName: coin.display_ticker || coin.display_name || coin.id,
    isTestnet,
    walletAddresses: Object.freeze(addresses),
  });
  contexts.set(context, { linking: false, linked: new Set() });
  assertCurrent(context);

  return context;
};

const rpcResult = response => {
  if (response?.error) {
    throw new Error(response.error.message || 'Unable to load identities.');
  }

  if (!response || !has(response, 'result')) {
    throw new Error('The network returned an invalid identity response.');
  }

  return response.result;
};

/** Return address-index matches this wallet has enough distinct keys to spend. */
export const discoverLinkableIdentities = async context => {
  const record = assertCurrent(context);
  const endpoint = VrpcProvider.getEndpoint(context.systemId);

  // Verify the server's network and use its current height to check timelocks.
  const infoResponse = await endpoint.getInfo();
  assertCurrent(context);

  const info = rpcResult(infoResponse);

  if (info?.chainid !== context.systemId) {
    throw new Error('The selected server is connected to a different network.');
  }

  if (!Number.isSafeInteger(info.blocks) || info.blocks < 0) {
    throw new Error('Unable to verify the current network height.');
  }

  // The address index supplies the definitions needed to check spending authority.
  const indexed = [];

  for (const address of context.walletAddresses) {
    const response = await endpoint.getIdentitiesWithAddress({
      address,
      unspent: true,
    });
    assertCurrent(context);

    const result = rpcResult(response);

    if (!Array.isArray(result)) {
      throw new Error('The network returned an invalid identity list.');
    }

    indexed.push(...result);
  }

  // An identity can match several wallet addresses. Keep the last returned
  // definition intact rather than combining signing keys from different results.
  const definitions = new Map();

  for (const result of indexed) {
    const identity = result?.identity || result;

    if (hasAddressVersion(identity?.identityaddress, I_ADDR_VERSION)) {
      definitions.set(identity.identityaddress, {
        ...identity,
        fullyqualifiedname: result?.fullyqualifiedname || identity.fullyqualifiedname,
      });
    }
  }

  // Root namespaces need no lookup. Resolve other parents once for the whole
  // discovery run, retaining full names separately from their display labels.
  const parentNames = new Map([
    [coinsList.VRSC.currency_id, 'VRSC@'],
    [coinsList.VRSCTEST.currency_id, 'VRSCTEST@'],
  ]);
  if (context.chain === 'VRSC' || context.chain === 'VRSCTEST') {
    parentNames.set(context.systemId, `${context.chain}@`);
  }
  const qualifyName = name => name.endsWith('@') ? name : `${name}@`;
  for (const [identityAddress, identity] of definitions) {
    if (typeof identity.fullyqualifiedname === 'string' && identity.fullyqualifiedname.trim()) {
      parentNames.set(identityAddress, qualifyName(identity.fullyqualifiedname.trim()));
    }
  }
  const resolveName = async (identityAddress, identity) => {
    if (parentNames.has(identityAddress)) return parentNames.get(identityAddress);
    const name = typeof identity.name === 'string' ? identity.name.trim() : '';
    if (!name) return null;
    if (!identity.parent) return qualifyName(name);

    if (!parentNames.has(identity.parent)) {
      const response = await getIdentity(context.systemId, identity.parent);
      assertCurrent(context);
      const parent = rpcResult(response);
      if (parent?.identity?.identityaddress !== identity.parent ||
          typeof parent.fullyqualifiedname !== 'string' || !parent.fullyqualifiedname.trim()) {
        throw new Error('Unable to resolve an identity’s parent namespace. Try loading identities again.');
      }
      parentNames.set(identity.parent, qualifyName(parent.fullyqualifiedname.trim()));
    }

    return `${name}.${parentNames.get(identity.parent)}`;
  };

  const linkedData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertCurrent(context);

  const linked = linkedData?.linked_ids?.[context.chain] || {};
  record.linked = new Set(Object.keys(linked));

  const rows = [];

  for (const [identityAddress, identity] of definitions) {
    if (!Array.isArray(identity.primaryaddresses)) {
      continue;
    }

    // A matching primary address is not enough: distinct wallet keys must meet
    // the full signature threshold, including for multisignature identities.
    const ownedAddresses = [
      ...new Set(
        identity.primaryaddresses.filter(address =>
          context.walletAddresses.includes(address),
        ),
      ),
    ];
    const minimumSignatures = identity.minimumsignatures;

    // Upper bounds from CPrincipal::IsValid: 25 keys and 13 signatures.
    if (
      !Number.isInteger(minimumSignatures) ||
      minimumSignatures < 1 ||
      minimumSignatures > 13 ||
      identity.primaryaddresses.length > 25 ||
      ownedAddresses.length < minimumSignatures
    ) {
      continue;
    }

    // Clearing the lock flag starts the countdown; spending remains locked
    // through the unlock height itself. Revocation also prevents spending.
    const revoked = (Number(identity.flags) & 0x8000) !== 0;
    const locked =
      (Number(identity.flags) & 2) !== 0 ||
      (Number(identity.timelock) > 0 && Number(identity.timelock) >= info.blocks);

    if (revoked || locked) {
      continue;
    }

    const fullyQualifiedName = await resolveName(identityAddress, identity);
    assertCurrent(context);

    // A saved link must carry its full name; an address cannot stand in for one.
    if (!fullyQualifiedName) {
      continue;
    }

    const row = Object.freeze({
      identityAddress,
      fullyQualifiedName,
      displayName: convertFqnToDisplayFormat(fullyQualifiedName),
      ownedAddresses: Object.freeze(ownedAddresses),
      minimumSignatures,
      canControl: true,
      revoked: false,
      locked: false,
      linked: has(linked, identityAddress),
    });

    discoveredRows.set(row, context);
    rows.push(row);
  }

  assertCurrent(context);

  return rows.sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
};

/** Refresh wallet state from saved links, including after a failed refresh. */
export const retryIdentityLinkRefresh = async context => {
  assertCurrent(context);

  const data = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertCurrent(context);

  store.dispatch(
    scopeSessionAction({
      type: SET_WATCHED_VERUSIDS,
      payload: { watchedVerusIds: data?.linked_ids || {} },
    }, context.sessionScope),
  );
  assertCurrent(context);

  // Rebuild wallet cards and polling through the existing link/unlink flow.
  const { setUserCoins } = require('../../actions/actionCreators');
  const {
    clearChainLifecycle,
    refreshActiveChainLifecycles,
  } = require('../../actions/actions/intervals/dispatchers/lifecycleManager');

  clearChainLifecycle(context.chain, undefined, context.sessionScope);
  assertCurrent(context);

  const state = store.getState();
  const action = setUserCoins(
    state.coins.activeCoinList,
    state.authentication.activeAccount.id,
  );

  store.dispatch(scopeSessionAction(action, context.sessionScope));
  assertCurrent(context);

  refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
  assertCurrent(context);
};

/** Save each selection through the existing serialized encrypted-storage writer. */
export const linkSelectedIdentities = async ({ context, identities }) => {
  const record = assertCurrent(context);

  if (record.linking) {
    throw new Error('Identities are already being linked.');
  }

  // Accept only the original rows discovered for this wallet context.
  if (
    !Array.isArray(identities) ||
    !identities.length ||
    identities.some(identity => discoveredRows.get(identity) !== context)
  ) {
    throw new Error('Select identities discovered for this wallet and network.');
  }

  const selections = [
    ...new Map(
      identities.map(identity => [identity.identityAddress, identity]),
    ).values(),
  ];
  const linked = [];
  const failed = [];
  let refreshError = null;

  record.linking = true;

  try {
    for (const identity of selections) {
      assertCurrent(context);

      try {
        // Retain successful writes so retrying a partial batch only saves failures.
        if (!record.linked.has(identity.identityAddress)) {
          await linkVerusId(
            identity.identityAddress,
            identity.fullyQualifiedName,
            context.chain,
            context,
          );
          assertCurrent(context);
          record.linked.add(identity.identityAddress);
        }

        linked.push(identity);
      } catch (error) {
        assertCurrent(context);

        if (error.code === 'SESSION_CHANGED') {
          throw error;
        }

        failed.push({ identity, error });
      }
    }

    // Refresh once after the batch; a refresh failure does not undo saved links.
    if (linked.length) {
      try {
        await retryIdentityLinkRefresh(context);
      } catch (error) {
        assertCurrent(context);

        if (error.code === 'SESSION_CHANGED') {
          throw error;
        }

        refreshError = error;
      }
    }

    return { linked, failed, refreshError };
  } finally {
    record.linking = false;
  }
};
