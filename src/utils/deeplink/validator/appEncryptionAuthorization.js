import {Buffer} from 'buffer';
import {ECPair, networks} from '@bitgo/utxo-lib';
import {fromBase58Check, I_ADDR_VERSION} from 'verus-typescript-primitives';
import store from '../../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {getIdentity} from '../../api/channels/verusid/callCreators';
import {getSignatureInfo} from '../../api/channels/vrpc/requests/getSignatureInfo';
import {verifyGenericRequest} from '../../api/channels/vrpc/requests/verifyGenericRequest';
import {requestPrivKey} from '../../auth/authBox';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {ELECTRUM, VRPC} from '../../constants/intervalConstants';
import VrpcProvider from '../../vrpc/vrpcInterface';
import {
  appEncryptionIdentityMatchesConstraints,
  getAppEncryptionIdentityConstraints,
} from './appEncryptionIdentityConstraints';

const identityAddress = address => {
  const decoded = fromBase58Check(address);

  if (decoded.version !== I_ADDR_VERSION || decoded.hash.length !== 20) {
    throw new Error('Invalid app encryption identity address.');
  }

  return address;
};

const identityResult = response => {
  if (response?.error) throw new Error(response.error.message);
  if (!response?.result?.identity) throw new Error('Identity could not be verified.');
  return response.result;
};

// A linked address alone is not signing control. Require a public key with a
// stored private key, and count its authority only once across wallet channels.
const signingKeys = (account, testnet) => {
  const keys = [];

  for (const [coinID, channels] of Object.entries(account.keys || {})) {
    let coin;

    try {
      coin = CoinDirectory.getBasicCoinObj(coinID);
    } catch (_) {
      continue;
    }

    if (!coin || !!coin.testnet !== testnet || !networks[coin.bitgojs_network_key]) continue;

    for (const channel of [VRPC, ELECTRUM]) {
      const key = channels?.[channel];

      if (
        !key?.encryptedPrivKey || typeof key.pubKey !== 'string' ||
        !/^(02|03)[0-9a-f]{64}$|^04[0-9a-f]{128}$/i.test(key.pubKey)
      ) continue;

      try {
        const publicKey = Buffer.from(key.pubKey, 'hex');
        const address = ECPair.fromPublicKeyBuffer(publicKey, networks.verus).getAddress();
        keys.push({coin, channel, address});
      } catch (_) {
        // Invalid or watch-only records cannot contribute signing authority.
      }
    }
  }

  return keys;
};

const requiredAuthorities = (result, keys, exclusive = false) => {
  const identity = result.identity;
  const threshold = identity.minimumsignatures;
  const addresses = new Set(identity.primaryaddresses || []);
  const controlled = new Set(keys.filter(key => addresses.has(key.address)).map(key => key.address));

  if (
    (identity.flags & 0x8000) !== 0 ||
    (result.status != null && result.status !== 'active') ||
    !Number.isSafeInteger(threshold) || threshold < 1 ||
    controlled.size < threshold
  ) {
    throw new Error('The active profile must fully control the identity signing threshold. Delegate authorization is unsupported.');
  }

  if (exclusive && controlled.size !== addresses.size) {
    throw new Error('The active profile must fully control every signing authority at the request signing height.');
  }

  // Sole control requires usable private keys for every authority, even when
  // the identity's ordinary signing threshold is lower.
  return {addresses, threshold: exclusive ? addresses.size : threshold};
};

const authorize = async (request, selectedIdentity, context = {}, signKey) => {
  if (!request.isSigned()) throw new Error('App encryption requires a signature.');

  const initialState = store.getState();
  const sessionScope = context.sessionScope || captureSessionScope(initialState);
  const network = JSON.stringify(initialState.authentication.activeAccount?.testnetOverrides || {});
  const needsProfile = request.hasAppOrDelegatorID() || selectedIdentity != null;
  const assertActive = () => {
    context.assertActive?.();

    if (!needsProfile) return;

    const state = store.getState();
    const account = state.authentication.activeAccount;

    if (
      !account || !sessionScopeIsCurrent(state, sessionScope) ||
      JSON.stringify(account.testnetOverrides || {}) !== network
    ) {
      throw Object.assign(new Error('The active profile changed. Review the request again.'), {code: 'SESSION_CHANGED'});
    }

    if ((Object.keys(account.testnetOverrides || {}).length > 0) !== request.isTestnet()) {
      throw new Error('The active profile is on a different network.');
    }
  };

  assertActive();
  const signerID = identityAddress(request.signature.identityID.toIAddress());
  const coinObj = CoinDirectory.getBasicCoinObj(request.signature.systemID.toIAddress());

  if (!coinObj?.system_id || !coinObj.vrpc_endpoints?.[0]) {
    throw new Error('Unsupported app encryption request chain.');
  }

  if (!!coinObj.testnet !== request.isTestnet()) {
    throw new Error('The request is on a different network.');
  }

  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  const signer = identityResult(await getIdentity(coinObj.system_id, signerID));
  assertActive();

  let signingIdentity = signer;

  if (request.hasAppOrDelegatorID()) {
    const {height} = await getSignatureInfo(
      coinObj.system_id, signerID, request.signature.signatureAsVch.toString('base64'),
    );
    assertActive();

    // Height zero means "current" to getidentity; it cannot prove past authority.
    if (!Number.isSafeInteger(height) || height <= 0 || height > 2147483647) {
      throw new Error('Invalid request signature height.');
    }

    signingIdentity = identityResult(await getIdentity(coinObj.system_id, signerID, height));
    assertActive();

    // RPC returns the last identity update height, which may precede signing.
    if (
      !Number.isSafeInteger(signingIdentity.blockheight) ||
      signingIdentity.blockheight < 0 || signingIdentity.blockheight > height
    ) {
      throw new Error('Unable to verify identity authority at the request signing height.');
    }
  }

  // No wallet key is accessed until the signed request has been verified.
  // For explicit scopes, verify against the historical record, not today's keys.
  const verified = await verifyGenericRequest(coinObj, request, signingIdentity, false);
  assertActive();
  if (!verified) throw new Error('Failed to verify request signature');
  const constraints = getAppEncryptionIdentityConstraints(request);

  const appScopeID = request.hasAppOrDelegatorID()
    ? identityAddress(request.appOrDelegatorID.toIAddress())
    : signerID;

  if (!needsProfile) return {coinObj, appScopeID};

  const identities = request.hasAppOrDelegatorID() ? [signer] : [];
  let selectedAddresses;

  if (selectedIdentity != null) {
    const selectedID = identityAddress(selectedIdentity.identityID);
    const selectedSystemID = identityAddress(selectedIdentity.systemID);
    const selectedCoin = CoinDirectory.getBasicCoinObj(selectedSystemID);

    if (selectedCoin?.system_id !== selectedSystemID || !selectedCoin.vrpc_endpoints?.[0]) {
      throw new Error('Unsupported selected identity chain.');
    }

    if (!!selectedCoin.testnet !== request.isTestnet()) {
      throw new Error('The selected identity is on a different network.');
    }

    VrpcProvider.initEndpoint(selectedSystemID, selectedCoin.vrpc_endpoints[0]);
    // The same ID can have different signing authorities on different chains.
    const selected = selectedID === signerID && selectedSystemID === coinObj.system_id
      ? signer
      : identityResult(await getIdentity(selectedSystemID, selectedID));

    assertActive();

    if (!appEncryptionIdentityMatchesConstraints(constraints, {
      identityID: selectedID,
      systemID: selectedSystemID,
      parentID: selected.identity.parent,
    })) {
      throw new Error('The selected identity does not satisfy the authentication constraints.');
    }

    identities.push(selected);
    selectedAddresses = new Set(selected.identity.primaryaddresses);
  }

  const keys = signingKeys(store.getState().authentication.activeAccount, request.isTestnet());
  // Check all thresholds before opening any private key, including the user's
  // selected identity. Signer equality with an explicit scope is no exception.
  const requirements = identities.map(identity => requiredAuthorities(identity, keys));

  if (request.hasAppOrDelegatorID()) {
    requirements.push(requiredAuthorities(signingIdentity, keys, true));
  }

  const usable = new Set();
  const controlled = () => requirements.every(({addresses, threshold}) =>
    [...usable].filter(address => addresses.has(address)).length >= threshold);

  for (const key of keys) {
    if (usable.has(key.address) || !requirements.some(({addresses}) => addresses.has(key.address))) continue;
    assertActive();
    let usablePair;

    try {
      const privateKey = await requestPrivKey(key.coin.id, key.channel, {sessionScope});
      assertActive();
      const pair = ECPair.fromWIF(privateKey, networks[key.coin.bitgojs_network_key]);
      const address = ECPair.fromPublicKeyBuffer(pair.getPublicKeyBuffer(), networks.verus).getAddress();

      if (address === key.address) usablePair = pair;
    } catch (error) {
      assertActive();
      if (error?.code === 'SESSION_CHANGED') throw error;
    }

    if (usablePair) {
      usable.add(key.address);

      // Signing uses each proved key only within this call, never UI or state.
      if (signKey && selectedAddresses.has(key.address)) {
        usablePair.network = networks.verus;
        signKey(usablePair);
      }
    }

    if (controlled()) break;
  }

  assertActive();
  if (!controlled()) throw new Error('The active profile cannot use the required identity signing keys.');

  return {coinObj, appScopeID};
};

export const assertSignedRequestAuthorization = (request, context) =>
  authorize(request, null, context);

// Called again at approval time; envelope validation may belong to an older
// profile or identity selection and cannot authorize access to channel keys.
export const assertAppEncryptionAuthorization = (request, selectedIdentity, context) => {
  if (selectedIdentity == null) throw new Error('Select a signing identity.');
  return authorize(request, selectedIdentity, context);
};

export const withAppEncryptionSigningKeys = (request, selectedIdentity, context, signKey) =>
  authorize(request, selectedIdentity, context, signKey);
