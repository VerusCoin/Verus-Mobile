import {Buffer} from 'buffer';
import {ECPair, Transaction, networks} from '@bitgo/utxo-lib';
import {verifyIdentityUpdateFunding} from 'verusid-ts-client';
import {
  Identity,
  IdentityScript,
  SmartTransactionScript,
  BigNumber as BN,
  fromBase58Check,
  toBase58Check,
  I_ADDR_VERSION,
  R_ADDR_VERSION,
} from 'verus-typescript-primitives';
import store from '../../store';
import {captureSessionScope, sessionScopeIsCurrent} from '../../actions/actions/updates/sessionRequests';
import VrpcProvider from '../vrpc/vrpcInterface';
import {signUpdateIdentityTx} from '../api/channels/verusid/requests/updateIdentity';

const fail = (code, message) => Object.assign(new Error(message), {code});

// Guards last only as long as an open review. No request or signed bytes are saved.
const inFlight = new Set();
const submissionAttempts = new WeakMap();

const ROOT_CHAIN_IDS = new Set(['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']);

const walletBinding = state => JSON.stringify(Object.entries(state.authentication.activeAccount?.keys || {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([coin, channels]) => [coin, channels.vrpc?.addresses || []]));

const result = response => {
  if (response?.error) throw new Error(response.error.message || 'The network request failed.');

  if (!response || !Object.prototype.hasOwnProperty.call(response, 'result')) {
    throw new Error('The network returned an invalid response.');
  }

  return response.result;
};

/** Bind a review to its account, network, and open dialog before asynchronous work. */
export const captureIdentityUpdateContext = ({request, ...options} = {}) => {
  const state = store.getState();
  const requestSystemId = request ? (request.systemID?.toAddress?.() ||
    (options.isTestnet ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' : 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV')) : options.systemId;
  const expiryHeight = request?.expiryHeight == null ? 0 : Number(request.expiryHeight.toString());

  if (!Number.isSafeInteger(expiryHeight) || expiryHeight < 0 || (request?.expiryHeight != null && expiryHeight === 0)) {
    throw new Error('The identity update request has an invalid or expired expiry height.');
  }

  const context = {
    ...options,
    sessionScope: options.sessionScope || captureSessionScope(state),
    walletBinding: walletBinding(state),
    requestSystemId,
    requestExpiryHeight: expiryHeight,
    identitySnapshots: (options.identitySnapshots || []).map(snapshot => ({...snapshot})),
  };

  assertIdentityUpdateContext(context);
  return Object.freeze(context);
};

export const assertIdentityUpdateContext = context => {
  // Imported-key revoke/recover can start signed out, but still belong to a session.
  if ((!context?.sessionScope?.accountHash && context?.allowSignedOut !== true) || context?.signal?.aborted ||
      !sessionScopeIsCurrent(store.getState(), context?.sessionScope)) {
    throw fail('SESSION_CHANGED', 'Account changed. Review this identity update again in the intended account.');
  }

  if (context.walletBinding != null && context.walletBinding !== walletBinding(store.getState())) {
    throw fail('SESSION_CHANGED', 'The wallet addresses changed. Review this identity update again.');
  }

  if (context.modalRequestId != null && store.getState().sendModal?.requestId !== context.modalRequestId) {
    throw fail('SESSION_CHANGED', 'The identity update dialog changed. Review this update again.');
  }

  if (context.requestSystemId && context.requestSystemId !== context.systemId) {
    throw new Error('The identity update request belongs to a different network.');
  }

  if (context.systemId && context.isTestnet != null) {
    const coin = store.getState().coins?.activeCoinsForUser?.find(item => item.currency_id === context.systemId);

    if (!coin || !!coin.testnet !== !!context.isTestnet) {
      throw new Error('The identity update network changed. Review it again.');
    }
  }
};

const guarded = async (context, task) => {
  assertIdentityUpdateContext(context);
  const value = await task();

  assertIdentityUpdateContext(context);
  return value;
};

export const requireIdentityFundingApproval = (built, lockContext) => {
  if (!built?.fundingApproval) {
    throw new Error('Missing verified identity funding approval. Review the transaction again.');
  }

  verifyIdentityUpdateFunding(built.fundingApproval, built.hex, built.utxos, lockContext);
  return built.fundingApproval;
};

export const assertIdentityUpdateInputMaturity = (approval, input, unspent) => {
  const source = approval.prevouts.find(previous => previous.txid === input.txid && previous.outputIndex === input.outputIndex);

  if (!source) throw new Error('The approved input is missing its verified source transaction.');

  const coinbase = Transaction.fromHex(source.rawTransaction, networks.verus).isCoinbase();

  // PBaaS maturity varies with block time, up to 149 blocks. Derive coinbase
  // status from verified bytes so a server cannot omit the gettxout flag.
  const maturity = ROOT_CHAIN_IDS.has(approval.systemId) ? 100 : 149;

  if ((coinbase || unspent.coinbase) && (!Number.isSafeInteger(unspent.confirmations) || unspent.confirmations < maturity)) {
    throw fail('REVIEW_CHANGED', 'A mining reward used for this update is not yet spendable.');
  }
};

const identityFromOutput = output => {
  const parsed = new IdentityScript();
  parsed.fromBuffer(Buffer.from(output.script));
  return parsed.getIdentity();
};

const fundingSigningAddress = (source, input) => {
  const bytes = Buffer.from(Transaction.fromHex(source.rawTransaction, networks.verus).outs[input.outputIndex].script);

  // Transparent outputs encode their controller directly in the script.
  if (bytes.length === 25 && bytes[0] === 0x76 && bytes[1] === 0xa9 && bytes[2] === 20 && bytes[23] === 0x88 && bytes[24] === 0xac) {
    return toBase58Check(bytes.subarray(3, 23), R_ADDR_VERSION);
  }

  if (((bytes.length === 35 && bytes[0] === 33) || (bytes.length === 67 && bytes[0] === 65)) && bytes[bytes.length - 1] === 0xac) {
    return ECPair.fromPublicKeyBuffer(bytes.subarray(1, -1), networks.verus).getAddress();
  }

  const smart = new SmartTransactionScript();
  smart.fromBuffer(bytes);
  const condition = smart.paramsOptCC;

  if (!condition.m.eqn(1) || !condition.n.eqn(1) || condition.destinations.length !== 1) {
    throw new Error('This funding output requires multiple controllers. Select a supported single-controller funding source.');
  }

  return condition.destinations[0].toAddress();
};

/** Check current on-chain controllers; new ownership applies only after the update. */
const checkIdentityUpdateAuthorities = async (context, built, keys, lockContext, checkKeys) => {
  const approval = requireIdentityFundingApproval(built, lockContext || await getIdentityUpdateLockContext(context));

  if (checkKeys && (!Array.isArray(keys) || keys.length !== built.utxos.length)) {
    throw new Error('Every approved input requires its signing keys.');
  }

  const endpoint = VrpcProvider.getEndpoint(context.systemId);
  const definition = approval.prevouts.find(input => input.txid === approval.identity.txid && input.outputIndex === approval.identity.outputIndex);
  const current = identityFromOutput(Transaction.fromHex(definition.rawTransaction, networks.verus).outs[definition.outputIndex]);
  const updated = Transaction.fromHex(built.hex, networks.verus).outs.map(output => {
    try {
      return identityFromOutput(output);
    } catch (_) {
      return null;
    }
  }).find(identity => identity?.getIdentityAddress() === current.getIdentityAddress());

  if (!updated) throw new Error('The reviewed identity output is missing.');

  if ((current.isRevoked() && current.hasTokenizedIdControl()) ||
      current.hasActiveCurrency() !== updated.hasActiveCurrency() ||
      current.hasTokenizedIdControl() !== updated.hasTokenizedIdControl()) {
    throw new Error('This identity operation requires currency or control-token authorization that this wallet cannot complete.');
  }

  // Changing an authority requires the previous controller's approval too.
  const authorityAddresses = new Set();

  if (current.isRevoked()) {
    authorityAddresses.add(current.recoveryAuthority.toAddress());
  } else {
    authorityAddresses.add(updated.isRevoked() ? current.revocationAuthority.toAddress() : current.getIdentityAddress());

    if (current.revocationAuthority.toAddress() !== updated.revocationAuthority.toAddress()) {
      authorityAddresses.add(current.revocationAuthority.toAddress());
    }

    if (current.recoveryAuthority.toAddress() !== updated.recoveryAuthority.toAddress()) {
      authorityAddresses.add(current.recoveryAuthority.toAddress());
    }

    if (updated.isRevoked()) {
      // Revocation alone is distinct from editing the identity at the same time.
      const primaryFields = identity => {
        const normalized = new Identity();
        normalized.fromBuffer(identity.toBuffer());
        // Prior multimap operations are transaction-local; new ones are checked below.
        normalized.clearContentMultiMap();
        normalized.flags = new BN(0);
        normalized.unlockAfter = new BN(0);
        normalized.setRecovery(current.recoveryAuthority.toAddress());
        normalized.setRevocation(current.revocationAuthority.toAddress());
        return normalized.toBuffer().toString('hex');
      };

      if (primaryFields(current) !== primaryFields(updated) ||
          updated.contentMultiMap.kvContent.size > 0 ||
          (updated.isLocked() && current.isLocked() !== updated.isLocked()) ||
          (!updated.unlockAfter.isZero() && !current.unlockAfter.eq(updated.unlockAfter)) ||
          current.hasActiveCurrency() !== updated.hasActiveCurrency() ||
          current.hasTokenizedIdControl() !== updated.hasTokenizedIdControl()) {
        authorityAddresses.add(current.getIdentityAddress());
      }
    }
  }

  const identities = new Map([[current.getIdentityAddress(), current]]);
  const identitySnapshots = [];
  const requireUnlocked = new Set();

  const readAuthority = async address => {
    if (identities.has(address)) return identities.get(address);

    const lookup = result(await guarded(context, () => endpoint.getIdentity(address)));
    const raw = result(await guarded(context, () => endpoint.getRawTransaction(lookup.txid, 0)));
    const tx = Transaction.fromHex(typeof raw === 'string' ? raw : raw?.hex, networks.verus);

    if (tx.getId() !== lookup.txid || !tx.outs[lookup.vout]) {
      throw new Error('The signing authority transaction could not be verified.');
    }

    const identity = identityFromOutput(tx.outs[lookup.vout]);

    if (identity.getIdentityAddress() !== address) {
      throw new Error('The signing authority does not match the requested identity.');
    }

    identities.set(address, identity);
    identitySnapshots.push({identityAddress: address, txid: lookup.txid, vout: lookup.vout});
    return identity;
  };

  for (let index = 0; index < built.utxos.length; index++) {
    const input = built.utxos[index];
    const supplied = checkKeys ? new Set((keys[index] || []).map(wif => ECPair.fromWIF(wif, networks.verus).getAddress())) : null;
    const isDefinition = input.txid === approval.identity.txid && input.outputIndex === approval.identity.outputIndex;
    const source = approval.prevouts.find(previous => previous.txid === input.txid && previous.outputIndex === input.outputIndex);

    // Derive the actual condition from the independently retained source bytes;
    // neither index labels nor membership in a multi-controller output suffices.
    const addresses = isDefinition ? authorityAddresses : [fundingSigningAddress(source, input)];

    for (const address of addresses) {
      if (!address) throw new Error('The verified signing address for an approved input is missing.');

      if (fromBase58Check(address).version === I_ADDR_VERSION) {
        const identity = await readAuthority(address);
        const primaries = new Set(identity.primaryAddresses.map(primary => primary.toAddress()));
        const minimum = identity.minSigs.toNumber();
        const count = supplied ? [...primaries].filter(primary => supplied.has(primary)).length : minimum;

        if (!isDefinition || address !== current.getIdentityAddress()) requireUnlocked.add(address);

        if (identity.isRevoked() || minimum < 1 || minimum > 13 || minimum > primaries.size ||
            primaries.size !== identity.primaryAddresses.length || count < minimum) {
          throw new Error('The available wallet keys cannot satisfy this identity’s required signatures. Use a wallet with all required signing keys.');
        }
      } else if (supplied && !supplied.has(address)) {
        throw new Error('A signing key does not control its approved funding input.');
      }
    }
  }

  // The daemon exempts the source identity only while spending its own
  // definition. Other authorities, and that same ID used as a funding source,
  // must be unlocked at the candidate height (serverchecker.cpp ExtractIDMap).
  const currentLockContext = await getIdentityUpdateLockContext(context);

  for (const address of requireUnlocked) {
    const identity = identities.get(address);

    if (identity.version.gten(2) && (identity.isLocked() || identity.unlockAfter.gten(currentLockContext.nextBlockHeight))) {
      // Fail closed for historical chain-specific unlock overrides; Mobile
      // cannot independently establish the old activation state here.
      throw fail('LOCKED_AUTHORITY', 'An identity used to authorize or fund this update is locked. Unlock it before sending this update.');
    }
  }

  requireIdentityFundingApproval(built, currentLockContext);
  assertIdentityUpdateContext(context);
  return {identitySnapshots, lockContext: currentLockContext};
};

export const assertIdentityUpdateSigningAuthority = async (context, built, keys, lockContext) =>
  (await checkIdentityUpdateAuthorities(context, built, keys, lockContext, true)).identitySnapshots;

export const assertIdentityUpdateAuthorityLocks = async (context, built, lockContext) =>
  (await checkIdentityUpdateAuthorities(context, built, undefined, lockContext, false)).lockContext;

/** Read the active height from the selected chain, never an estimated tip or a receipt. */
export const getIdentityUpdateLockContext = async context => {
  assertIdentityUpdateContext(context);
  const info = result(await guarded(context, () => VrpcProvider.getEndpoint(context.systemId).getInfo()));

  if (info.chainid !== context.systemId || !Number.isSafeInteger(info.blocks) || info.blocks < 0 || info.blocks >= 0xffffffff) {
    throw new Error('Unable to verify the identity update network and height.');
  }

  return {chainId: context.systemId, nextBlockHeight: info.blocks + 1};
};

/** Check live state separately from the SDK's offline conservation checks. */
export const validateIdentityUpdateContext = async (context, built) => {
  const lockContext = await getIdentityUpdateLockContext(context);
  const endpoint = VrpcProvider.getEndpoint(context.systemId);
  const requestExpired = height => context.requestExpiryHeight > 0 && height >= context.requestExpiryHeight;

  if (requestExpired(lockContext.nextBlockHeight)) {
    throw fail('REVIEW_CHANGED', 'This identity update request has expired.');
  }
  if (!built) return lockContext.nextBlockHeight - 1;

  const approval = requireIdentityFundingApproval(built, lockContext);

  if (approval.systemId !== context.systemId ||
      (context.changeAddress && approval.changeAddress !== context.changeAddress) ||
      (context.identityAddress && approval.identity.identityAddress !== context.identityAddress)) {
    throw new Error('The funding approval does not match the reviewed identity, network, or change address.');
  }

  const transaction = Transaction.fromHex(built.hex, networks.verus);

  if (!transaction.expiryHeight || lockContext.nextBlockHeight >= transaction.expiryHeight) {
    throw fail('REVIEW_CHANGED', 'This transaction review has expired. Review the identity update again.');
  }

  // The source identity and all reviewed authorities must still be current.
  const currentIdentity = result(await guarded(context, () => endpoint.getIdentity(approval.identity.identityAddress)));

  if (currentIdentity?.txid !== approval.identity.txid || currentIdentity?.vout !== approval.identity.outputIndex) {
    throw fail('REVIEW_CHANGED', 'The identity changed after review. Review the update again.');
  }

  for (const snapshot of context.identitySnapshots || []) {
    const authority = result(await guarded(context, () => endpoint.getIdentity(snapshot.identityAddress)));

    if (authority?.txid !== snapshot.txid || authority?.vout !== snapshot.vout) {
      throw fail('REVIEW_CHANGED', 'An identity authority changed after review. Review this update again.');
    }
  }

  for (const input of built.utxos) {
    const unspent = result(await guarded(context, () => endpoint.getTxOut(input.txid, input.outputIndex, true)));

    if (!unspent) throw fail('REVIEW_CHANGED', 'An approved transaction input is no longer available.');
    assertIdentityUpdateInputMaturity(approval, input, unspent);
  }

  // Authority and UTXO reads can take time. Bind the returned observation to a
  // fresh active tip so callers can use it immediately for signing/submission.
  const finalContext = await assertIdentityUpdateAuthorityLocks(context, built, lockContext);

  if (requestExpired(finalContext.nextBlockHeight) || finalContext.nextBlockHeight >= transaction.expiryHeight) {
    throw fail('REVIEW_CHANGED', 'This transaction review has expired. Review the identity update again.');
  }

  requireIdentityFundingApproval(built, finalContext);
  return finalContext.nextBlockHeight - 1;
};

const unknownBroadcast = txid => Object.assign(fail(
  'BROADCAST_UNKNOWN',
  `Delivery of identity update ${txid} is not confirmed. Check its status before reviewing another update.`,
), {txid, submitted: true});

/** Sign and send one reviewed update. Closing the review discards its state. */
export const submitReviewedIdentityUpdate = async ({built, context, getKeys}) => {
  assertIdentityUpdateContext(context);

  if (!built?.fundingApproval) {
    throw new Error('Missing verified identity funding approval. Review the transaction again.');
  }

  const previousAttempt = submissionAttempts.get(built);

  if (previousAttempt) {
    if (previousAttempt.acknowledged) return {txid: previousAttempt.txid};
    throw unknownBroadcast(previousAttempt.txid);
  }

  const approval = built.fundingApproval;
  const id = JSON.stringify([
    context.sessionScope.accountHash,
    context.systemId,
    approval.identity.txid,
    approval.identity.outputIndex,
  ]);

  if (inFlight.has(id)) throw new Error('This identity update is already being sent.');
  inFlight.add(id);

  let attempt;

  try {
    const endpoint = VrpcProvider.getEndpoint(context.systemId);

    // Authorization can take time. Recheck inputs and controllers afterward.
    await validateIdentityUpdateContext(context, built);
    const keys = await guarded(context, getKeys);
    await validateIdentityUpdateContext(context, built);
    const signingAuthorities = await assertIdentityUpdateSigningAuthority(context, built, keys);
    const signingContext = {
      ...context,
      identitySnapshots: [...(context.identitySnapshots || []), ...signingAuthorities],
    };
    const height = await validateIdentityUpdateContext(signingContext, built);
    const lockContext = {chainId: context.systemId, nextBlockHeight: height + 1};
    const signedHex = signUpdateIdentityTx(context.systemId, built.hex, built.utxos, keys, approval, lockContext);
    const signed = Transaction.fromHex(signedHex, networks.verus);

    if (signed.ins.some(input => !input.script.length)) {
      throw new Error('The identity update is missing a required signature. Nothing was sent.');
    }

    const txid = signed.getId();

    // Verify the final bytes against the same approval immediately before send.
    const finalHeight = await validateIdentityUpdateContext(signingContext, built);
    verifyIdentityUpdateFunding(approval, signedHex, built.utxos, {
      chainId: context.systemId,
      nextBlockHeight: finalHeight + 1,
    });

    const returnedTxid = result(await guarded(signingContext, () => {
      // Handoff consumes the review; acknowledgement depends on the reply.
      attempt = {txid, submitted: true, acknowledged: false};
      submissionAttempts.set(built, attempt);
      return endpoint.sendRawTransaction(signedHex);
    }));

    if (returnedTxid !== txid) throw new Error('The server returned a different transaction ID.');

    attempt.acknowledged = true;
    return {txid};
  } catch (error) {
    if (!attempt) throw error;
    if (error?.code === 'SESSION_CHANGED') {
      throw Object.assign(error, {txid: attempt.txid, submitted: attempt.submitted});
    }
    throw unknownBroadcast(attempt.txid);
  } finally {
    inFlight.delete(id);
  }
};
