import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {ECPair, Transaction, networks} from '@bitgo/utxo-lib';
import {VerusIdInterface, verifyIdentityUpdateFunding} from 'verusid-ts-client';
import {
  IdentityScript,
  TransferDestination,
  DEST_PKH,
  I_ADDR_VERSION,
  R_ADDR_VERSION,
  fromBase58Check,
} from 'verus-typescript-primitives';

import store from '../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import {requestPrivKey} from '../auth/authBox';
import VrpcProvider from '../vrpc/vrpcInterface';
import {getIdentity} from '../api/channels/verusid/requests/getIdentity';
import {
  getUpdatableIdentity,
  createUpdateIdentityTxWithUtxos,
  createUpdateIdentityWithCurrencyTransferTx,
  signUpdateIdentityTx,
} from '../api/channels/verusid/requests/updateIdentity';
import {getSpendableUtxos} from '../api/channels/vrpc/requests/getAddressUtxos';
import {convertFqnToDisplayFormat} from '../fullyqualifiedname';
import {identityToDisplayJson} from '../identityUpdate/identityDisplay';
import {DLIGHT_PRIVATE} from '../constants/intervalConstants';
import {
  buildModifiedIdentity,
  buildTransferredIdentity,
  getIdentityEditFields,
  validatePrivateAddress,
} from './identityDefinition';
import {
  readIdentityFunds,
  identityOutputAmounts,
  addIdentityAmounts,
} from './identityFunds';
import {
  assertIdentityUpdateInputMaturity,
  assertIdentityUpdateAuthorityLocks,
} from '../identityUpdate/verifiedSubmission';

// Models and approvals are opaque, session-bound handles. Navigation and UI
// state only receive display data, never the authoritative transaction or keys.
const models = new WeakMap();
const plans = new WeakMap();
const activeSends = new Set();

const fail = (code, message) => Object.assign(new Error(message), {code});
const copy = value => JSON.parse(JSON.stringify(value));

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }

  return value;
};

const rpcResult = response => {
  if (response?.error) {
    throw new Error(response.error.message || 'The network request failed.');
  }

  if (!response || !Object.prototype.hasOwnProperty.call(response, 'result')) {
    throw new Error('The network returned an invalid response.');
  }

  return response.result;
};

export const captureIdentityUpdateContext = requestContext => ({
  ...(requestContext || {}),
  sessionScope:
    requestContext?.sessionScope ||
    (requestContext?.sessionScoped ? requestContext : captureSessionScope(store.getState())),
});

const assertContext = context => {
  if (
    !context?.sessionScope?.accountHash ||
    context.signal?.aborted ||
    !sessionScopeIsCurrent(store.getState(), context.sessionScope)
  ) {
    throw fail('SESSION_CHANGED', 'Account changed. Open this identity again in the intended account.');
  }
};

const guarded = async (context, task) => {
  assertContext(context);
  const result = await task();
  assertContext(context);
  return result;
};

const inBatches = async (items, task) => {
  for (let offset = 0; offset < items.length; offset += 4) {
    await Promise.all(items.slice(offset, offset + 4).map(task));
  }
};

const assertOwner = (record, context) => {
  assertContext(context);

  if (
    !record ||
    record.scope.accountHash !== context.sessionScope.accountHash ||
    record.scope.sessionEpoch !== context.sessionScope.sessionEpoch
  ) {
    throw fail('REVIEW_CHANGED', 'Open this identity again and review the changes.');
  }
};

const versionOf = value => {
  try {
    return fromBase58Check(value).version;
  } catch (_) {
    return null;
  }
};

const displayName = result => convertFqnToDisplayFormat(result.fullyqualifiedname);

const canSign = (identity, address) =>
  !identity.isRevoked() &&
  identity.minSigs.toNumber() === 1 &&
  identity.primaryAddresses.some(primary => primary.toAddress() === address);

const readChain = async (coin, context) => {
  const result = rpcResult(
    await guarded(context, () => VrpcProvider.getEndpoint(coin.system_id).getInfo()),
  );

  if (result.chainid !== coin.system_id) {
    throw new Error('The selected server is connected to a different network.');
  }

  if (!Number.isSafeInteger(result.blocks) || result.blocks < 0 || result.blocks >= 0xffffffff) {
    throw new Error('Unable to verify the current network height.');
  }

  return result.blocks;
};

const readIdentity = async (coin, lookup, context) => {
  const identifier = typeof lookup === 'string' ? lookup.trim() : '';

  if (versionOf(identifier) !== I_ADDR_VERSION && !/^[^@]+@$/.test(identifier)) {
    throw new Error('Enter an identity address or an identity name ending in @, such as satoshi@.');
  }

  const response = rpcResult(await guarded(context, () => getIdentity(coin.system_id, identifier, -1)));

  if (
    !/^[0-9a-f]{64}$/i.test(response.txid) ||
    !Number.isSafeInteger(response.vout) || response.vout < 0 ||
    !Number.isSafeInteger(response.blockheight) || response.blockheight < 0
  ) {
    throw new Error('The network returned an invalid identity transaction.');
  }

  let decoded;

  try {
    decoded = await guarded(context, () => getUpdatableIdentity(coin.system_id, response));
  } catch (error) {
    if (/Pubkey Principal not yet supported/i.test(error.message || '')) {
      throw new Error('This identity uses public-key controllers that this wallet cannot edit.');
    }

    if (error.message === 'Could not find identity output in tx') {
      throw new Error('This identity’s controller or transaction format cannot be edited by this wallet.');
    }

    throw error;
  }

  const tx = Transaction.fromHex(decoded.tx, networks.verus);
  if (tx.getId() !== response.txid || !tx.outs[response.vout]) {
    throw new Error('Identity transaction does not match the requested identity.');
  }

  const output = tx.outs[response.vout];

  // The update SDK appends a zero-value identity definition input. Refuse an
  // unusual definition carrying native value rather than hiding it in fees.
  if (output.value !== 0) {
    throw new Error('This identity has an unsupported definition output. No transaction was created.');
  }

  const script = new IdentityScript();
  script.fromBuffer(Buffer.from(output.script));
  const identity = script.getIdentity();

  if (
    identity.getIdentityAddress() !== response.identity.identityaddress ||
    (versionOf(identifier) === I_ADDR_VERSION && identity.getIdentityAddress() !== identifier) ||
    !identity.toBuffer().equals(decoded.identity.toBuffer())
  ) {
    throw new Error('Identity transaction data does not match the requested identity.');
  }

  return {
    identity,
    rawTx: decoded.tx,
    txid: response.txid,
    vout: response.vout,
    height: response.blockheight,
    address: identity.getIdentityAddress(),
    name: displayName(response),
  };
};

const identitySources = (coin, signingAddress, state) => {
  const linked = state.channelStore_verusid?.watchedVerusIds || {};
  const names = {
    ...(linked[coin.testnet ? 'VRSCTEST' : 'VRSC'] || {}),
    ...(linked[coin.id] || {}),
  };
  const sources = [
    {address: signingAddress, fundingName: 'Wallet address', isIdentity: false},
    ...Object.entries(names)
      .filter(([address, name]) => versionOf(address) === I_ADDR_VERSION && typeof name === 'string')
      .map(([address, name]) => ({
        address,
        fundingName: convertFqnToDisplayFormat(name),
        isIdentity: true,
      })),
  ];

  return sources.map(source => ({
    ...source,
    balance: String(
      state.ledger?.balances?.[`vrpc.${source.address}.${coin.system_id}`]?.[coin.id]?.confirmed || '0',
    ),
  }));
};

const resolveLabels = async (coin, identity, names, context) => {
  const addresses = [
    identity.recoveryAuthority.toAddress(),
    identity.revocationAuthority.toAddress(),
    identity.parent?.toAddress(),
    identity.systemId?.toAddress(),
  ];

  await Promise.all(
    [...new Set(addresses)]
      .filter(address => address && !names[address] &&
        !fromBase58Check(address).hash.equals(Buffer.alloc(20)))
      .map(async address => {
        try {
          const result = rpcResult(await guarded(context, () => getIdentity(coin.system_id, address, -1)));
          names[address] = displayName(result);
        } catch (_) {
          // Labels are optional; session checks still apply.
          assertContext(context);
        }
      }),
  );

  return names;
};

/** Load an active native-chain identity from its actual definition transaction. */
export const loadIdentityForUpdate = async ({chain, identityAddress}, requestContext) => {
  const context = captureIdentityUpdateContext(requestContext);
  assertContext(context);

  const state = store.getState();
  const chainId = typeof chain === 'string' ? chain : chain?.id;
  const found = (state.coins.activeCoinsForUser || []).find(coin =>
    (coin.id === chainId || coin.system_id === chainId) && coin.currency_id === coin.system_id,
  );
  if (!found) {
    throw new Error('Add this identity’s network wallet before modifying or transferring it.');
  }

  const coin = {...found};
  const signingAddress = state.authentication.activeAccount.keys?.[coin.id]?.vrpc?.addresses?.[0];
  if (versionOf(signingAddress) !== R_ADDR_VERSION) {
    throw new Error('This network needs an active transparent wallet to update identities.');
  }

  const height = await readChain(coin, context);
  const subject = await readIdentity(coin, identityAddress, context);
  if (subject.identity.isRevoked()) {
    throw new Error('This identity is revoked. Recover it before modifying or transferring it.');
  }
  if (!canSign(subject.identity, signingAddress)) {
    throw new Error(subject.identity.minSigs.toNumber() > 1
      ? 'This identity requires multiple signatures. This wallet cannot complete its update by itself.'
      : 'This wallet does not hold a primary signing key for this identity.');
  }

  const fundingSources = identitySources(coin, signingAddress, state);
  const identityNames = await resolveLabels(coin, subject.identity, {[subject.address]: subject.name}, context);
  let walletPrivateAddress = '';
  try {
    walletPrivateAddress = validatePrivateAddress(state.authentication.activeAccount.keys?.[coin.id]?.[DLIGHT_PRIVATE]?.addresses?.[0] || '');
  } catch (_) {
    // An unavailable or invalid private address must not prevent other edits.
  }
  const model = freeze({
    displayName: subject.name,
    identityAddress: subject.address,
    chainTicker: coin.id,
    systemId: coin.system_id,
    networkName: coin.display_ticker || coin.display_name || coin.id,
    isTestnet: coin.testnet === true,
    identity: identityToDisplayJson(subject.identity),
    fields: getIdentityEditFields(subject.identity),
    identityNames,
    signingAddress,
    walletPrivateAddress,
    fundingAddress: signingAddress,
    fundingSources,
    locked: subject.identity.isLocked() || subject.identity.unlockAfter.toNumber() > height,
  });

  models.set(model, {scope: {...context.sessionScope}, coin, subject, signingAddress, fundingSources});
  return model;
};

const assertSnapshotCurrent = async (coin, snapshot, context) => {
  const current = await readIdentity(coin, snapshot.address, context);
  if (
    current.txid !== snapshot.txid || current.vout !== snapshot.vout ||
    !current.identity.toBuffer().equals(snapshot.identity.toBuffer())
  ) {
    throw fail('REVIEW_CHANGED', `${snapshot.name} changed on the network. Review the updated details before continuing.`);
  }
};

const feeCap = identity => {
  // Mirrors GetIdentityFeeFactor in VerusCoin: ordinary updates cost .0001;
  // additional primary/private addresses and retained content-map entries cost
  // another .0001 each, plus each 128 bytes of nonempty content-multimap data.
  // Large valid definitions must not hit a small fixed cap.
  const contentFactor = identity.contentMultiMap.kvContent.size
    ? Math.ceil((identity.contentMultiMap.getByteLength() - 1) / 128)
    : 0;
  const factor = contentFactor + identity.contentMap.size + Math.max(0, identity.primaryAddresses.length - 1) +
    Math.max(0, (identity.privateAddresses || []).length - 1);

  return new BigNumber(Math.max(10, factor)).times('0.0001').toNumber();
};

const fundSnapshot = (coin, subject, context) => readIdentityFunds({
  // The normal polling endpoint caches address-mempool responses. Approval
  // checks require a new network response, including immediately after review.
  endpoint: VrpcProvider.getVerusIdInterface(coin.system_id).interface,
  systemId: coin.system_id,
  subject,
  call: task => guarded(context, task),
});

const currencyTransferOutputs = (address, balances) => {
  const currencies = Object.fromEntries([...balances].map(([id, value]) => [id, value.toFixed(0)]));
  const destination = new TransferDestination({
    type: DEST_PKH,
    destinationBytes: fromBase58Check(address).hash,
  });

  return [{currencies, address: destination}];
};

const transferOutput = (systemId, address, balances, height) => {
  return Transaction.fromHex(
    VerusIdInterface.createUnfundedCurrencyTransferTransaction(
      systemId, currencyTransferOutputs(address, balances), height + 20,
    ),
    networks.verus,
  ).outs;
};

const appendInputs = (transaction, utxos) => {
  for (const input of utxos)
    transaction.addInput(Buffer.from(input.txid, 'hex').reverse(), input.outputIndex);
};

const buildWithFundsReturned = async ({
  coin,
  subject,
  updated,
  funds,
  fundingUtxos,
  fundingAddress,
  returnAddress,
  height,
  maxFee,
  context,
}) => {
  if (fundingUtxos.length > 1000) {
    throw new Error('This payment source has too many outputs to fund one transfer. Consolidate its funds or choose another payment source.');
  }

  const client = VrpcProvider.getVerusIdInterface(coin.system_id);
  const base = await guarded(context, () => client.createUpdateIdentityTransaction(
    updated, returnAddress, subject.rawTx, subject.height, undefined, coin.system_id,
    maxFee, undefined, height, undefined, true, coin.testnet === true,
  ));
  const transaction = Transaction.fromHex(base.hex, networks.verus);
  const selfFunded = fundingAddress === subject.address;
  const returned = new Map(funds.balances);
  const changeAddress = selfFunded ? returnAddress : fundingAddress;
  let funded;
  let available;

  if (selfFunded) {
    if (!(funds.balances.get(coin.system_id) || new BigNumber(0)).gt(0)) {
      throw new Error('This identity has no native currency for the transfer fee. Choose another payment source.');
    }

    // Ask the daemon for the fee of an identity plus a return output with the
    // exact reserve-currency layout. Zero native leaves room to quote the fee
    // even when all the user's native funds are held by this identity.
    const quoteValues = new Map(funds.balances);
    quoteValues.set(coin.system_id, new BigNumber(0));
    transaction.outs.push(...transferOutput(coin.system_id, returnAddress, quoteValues, height));
    const quote = rpcResult(await guarded(context, () => client.interface.fundRawTransaction(
      transaction.toHex(),
      funds.utxos.map(input => ({txid: input.txid, voutnum: input.outputIndex})),
      returnAddress,
    )));
    const fee = new BigNumber(String(quote.fee)).times('100000000');

    if (!fee.isInteger() || !fee.isGreaterThan(0) || fee.isGreaterThan(new BigNumber(maxFee).times('100000000'))) {
      throw new Error('The identity transfer fee is outside the permitted range.');
    }

    const quotedTransaction = Transaction.fromHex(quote.hex, networks.verus);
    const quotedInputs = new Set();
    let quotedNative = new BigNumber(0);

    for (const input of quotedTransaction.ins) {
      const txid = Buffer.from(input.hash).reverse().toString('hex');
      const key = `${txid}:${input.index}`;
      const prevout = funds.utxos.find(item => item.txid === txid && item.outputIndex === input.index);
      if (!prevout || quotedInputs.has(key))
        throw new Error('The fee quote contains unexpected or duplicate inputs.');

      quotedInputs.add(key);
      quotedNative = quotedNative.plus(prevout.satoshis);
    }

    for (const output of quotedTransaction.outs)
      quotedNative = quotedNative.minus(output.value);

    if (!quotedNative.eq(fee))
      throw new Error('The quoted fee does not match the transaction’s verified inputs and outputs.');

    const remaining = (returned.get(coin.system_id) || new BigNumber(0)).minus(fee);
    if (remaining.isNegative())
      throw new Error('This identity does not have enough native currency for the transfer fee. Choose another payment source.');

    returned.set(coin.system_id, remaining);
    const complete = Transaction.fromHex(base.hex, networks.verus);

    // Every subject output is required by the sweep, independently of which
    // candidates the daemon chose for its fee quote. This is not a selector.
    appendInputs(complete, funds.utxos);
    complete.outs.push(...transferOutput(coin.system_id, returnAddress, returned, height));
    funded = {hex: complete.toHex(), fee: fee.dividedBy('100000000').toNumber(), changepos: 1};
    available = funds.utxos;
  } else {
    appendInputs(transaction, funds.utxos);
    transaction.outs.push(...transferOutput(coin.system_id, returnAddress, funds.balances, height));

    // Preselected subject inputs are balanced by the explicit return output.
    // The daemon selects only additional fee inputs. Their change stays at the
    // selected payment source, separate from the identity funds returned home.
    funded = rpcResult(await guarded(context, () => client.interface.fundRawTransaction(
      transaction.toHex(),
      fundingUtxos.map(input => ({txid: input.txid, voutnum: input.outputIndex})),
      changeAddress,
    )));
    available = [...funds.utxos, ...fundingUtxos];
  }

  const built = await guarded(context, () => createUpdateIdentityWithCurrencyTransferTx({
    systemId: coin.system_id,
    identity: updated,
    changeAaddr: changeAddress,
    rawIdTx: subject.rawTx,
    idHeight: subject.height,
    utxos: available,
    currencyTransferOutputs: currencyTransferOutputs(returnAddress, returned),
    expectedIdentityPrimaryAddresses: updated.primaryAddresses.map(primary => primary.toAddress()),
    expectedIdentityMinimumSignatures: updated.minSigs.toNumber(),
    maxFee,
    fundRawTransactionResult: funded,
    currentHeight: height,
    isTestnet: coin.testnet === true,
  }));
  const selected = new Set(built.utxos.map(input => `${input.txid}:${input.outputIndex}`));
  if (funds.utxos.some(input => !selected.has(`${input.txid}:${input.outputIndex}`))) {
    throw new Error('The transaction did not return all identity funds. Nothing was sent.');
  }

  // Combined transfers report explicit returned amounts as sent deltas as
  // well as fees. Remove only the exact approved return values before applying
  // the existing native-fee cap and no-reserve-fee checks.
  if (!(built.deltas instanceof Map))
    throw new Error('Unable to verify the identity update fee currency.');

  const feeDeltas = new Map(built.deltas);

  for (const [currency, value] of returned) {
    if (value.gt(0) && !feeDeltas.has(currency))
      throw new Error('The returned currency amount could not be verified.');

    if (feeDeltas.has(currency))
      feeDeltas.set(currency, new BigNumber(feeDeltas.get(currency).toString()).plus(value));
  }

  return {...built, deltas: feeDeltas};
};

const describeFunds = async (balances, coin, context) => {
  const active = store.getState().coins.activeCoinsForUser || [];

  return Promise.all(
    [...balances]
      .filter(([, amount]) => amount.gt(0))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([currencyId, amount]) => {
        const known = active.find(item => item.currency_id === currencyId && item.system_id === coin.system_id);
        let label = known?.display_ticker || known?.display_name || known?.id;

        if (!label) {
          try {
            const currency = rpcResult(await guarded(context, () => VrpcProvider.getEndpoint(coin.system_id).getCurrency(currencyId)));
            if (currency.currencyid === currencyId) label = currency.fullyqualifiedname || currency.name;
          } catch (_) {
            assertContext(context);
          }
        }

        return {
          currencyId,
          amount: amount.dividedBy('100000000').toFixed(),
          amountSatoshis: amount.toFixed(0),
          label: label || currencyId,
        };
      }),
  );
};

/** Prepare once, then display plan.review before calling sendIdentityUpdate. */
export const prepareIdentityUpdate = async (model, options, requestContext) => {
  const context = captureIdentityUpdateContext(requestContext);
  const loaded = models.get(model);
  assertOwner(loaded, context);

  const {coin, subject, signingAddress, fundingSources} = loaded;
  const {
    mode,
    changes,
    recipient,
    fundingAddress = model.fundingAddress,
    returnFunds: requestedReturnFunds = true,
    returnAddress = signingAddress,
  } = options || {};

  if (!['modify', 'transfer'].includes(mode))
    throw new Error('Choose whether to modify or transfer this identity.');

  const enteredRecipient = typeof recipient === 'string' ? recipient.trim() : '';
  if (
    mode === 'transfer' &&
    ![R_ADDR_VERSION, I_ADDR_VERSION].includes(versionOf(enteredRecipient)) &&
    !/^[^@]+@$/.test(enteredRecipient)
  ) {
    throw new Error('Enter a transparent R-address, an identity address, or a VerusID name ending in @, such as satoshi@.');
  }

  const source = fundingSources.find(item => item.address === fundingAddress);
  if (!source) throw new Error('Select a payment source belonging to this wallet.');

  const returnFunds = mode === 'transfer' && requestedReturnFunds !== false;
  if (returnFunds && returnAddress !== signingAddress)
    throw new Error('Return identity funds to this wallet’s main transparent address.');

  // Resolve the requested controls against current identity definitions.
  const height = await readChain(coin, context);
  await assertSnapshotCurrent(coin, subject, context);
  const snapshots = new Map([[subject.address, subject]]);
  const names = {...model.identityNames};
  const readOnce = async address => {
    if (snapshots.has(address)) return snapshots.get(address);

    const result = await readIdentity(coin, address, context);
    snapshots.set(result.address, result);
    names[result.address] = result.name;

    return result;
  };

  let updated;
  let recipientName = null;
  let usesRecipientPrivateAddress = false;

  if (mode === 'transfer') {
    if (versionOf(enteredRecipient) === R_ADDR_VERSION) {
      updated = buildTransferredIdentity(subject.identity, {address: enteredRecipient});
      recipientName = enteredRecipient;
    } else {
      const target = await readOnce(enteredRecipient);
      updated = buildTransferredIdentity(subject.identity, {targetIdentity: target.identity});
      recipientName = target.name;
      usesRecipientPrivateAddress = !!target.identity.privateAddresses?.[0];
    }
  } else {
    const resolved = {...changes};

    for (const field of ['recoveryauthority', 'revocationauthority']) {
      if (Object.prototype.hasOwnProperty.call(resolved, field)) {
        const authority = await readOnce(resolved[field]);
        if (authority.identity.isRevoked())
          throw new Error(`${authority.name} is revoked. Choose an active authority.`);

        resolved[field] = authority.address;
      }
    }

    updated = buildModifiedIdentity(subject.identity, resolved);
  }

  const before = getIdentityEditFields(subject.identity);
  const after = getIdentityEditFields(updated);

  for (const [field, label] of [['recoveryauthority', 'recovery'], ['revocationauthority', 'revocation']]) {
    if (before[field] !== after[field]) {
      const authority = await readOnce(before[field]);
      if (!canSign(authority.identity, signingAddress)) {
        throw new Error(`Changing the ${label} identity requires its current signing authority. This wallet cannot provide all required signatures.`);
      }
    }
  }

  if (source.isIdentity) {
    const funding = await readOnce(source.address);
    if (
      !canSign(funding.identity, signingAddress) ||
      funding.identity.isLocked() ||
      funding.identity.unlockAfter.toNumber() > height
    ) {
      throw new Error('The selected payment identity is locked or needs signing keys unavailable in this wallet. Select another payment source.');
    }
  }

  // Build the payment and any requested return of the identity's funds.
  const funds = mode === 'transfer' ? await fundSnapshot(coin, subject, context) : null;
  const hasFunds = funds && [...funds.balances.values()].some(amount => amount.gt(0));
  if (
    returnFunds && hasFunds &&
    (model.locked || funds.utxos.some(input => input.isspendable !== true && input.isspendable !== 1))
  ) {
    throw new Error('This identity has locked or unavailable funds. Unlock them before returning its funds, or leave them with the identity and review the amounts transferred.');
  }
  const utxos = funds && fundingAddress === subject.address
    ? funds.utxos.filter(input => input.isspendable === true || input.isspendable === 1)
    : await guarded(context, () => getSpendableUtxos(coin.system_id, coin.system_id, [fundingAddress]));

  if (!utxos.length)
    throw new Error('The selected payment source has no spendable funds for the network fee.');

  updated.upgradeVersion();
  const expectedIdentityHex = updated.toBuffer().toString('hex');
  const returningFunds = returnFunds && hasFunds;

  // Returning funds adds an explicit output and may carry a large reserve map.
  // Leave bounded headroom over the identity's own size/address fee factor.
  const maxFee = new BigNumber(feeCap(updated)).plus(returningFunds ? '0.0005' : 0).toNumber();
  const built = returningFunds
    ? await buildWithFundsReturned({
      coin,
      subject,
      updated,
      funds,
      fundingUtxos: utxos,
      fundingAddress,
      returnAddress,
      height,
      maxFee,
      context,
    })
    : await guarded(context, () => createUpdateIdentityTxWithUtxos({
      systemId: coin.system_id,
      identity: updated,
      changeAaddr: fundingAddress,
      rawIdTx: subject.rawTx,
      idHeight: subject.height,
      utxos,
      maxFee,
      currentHeight: height,
      isTestnet: coin.testnet === true,
    }));
  const changeAddress = returningFunds && fundingAddress === subject.address ? returnAddress : fundingAddress;

  if (!built.fundingApproval)
    throw new Error('Unable to independently verify identity update funding. Nothing was sent.');

  // The SDK supplies an immutable approval; retain its strings without JSON
  // copying potentially large raw transactions once for every selected input.
  const fundingApproval = freeze(built.fundingApproval);
  verifyIdentityUpdateFunding(fundingApproval, built.hex, built.utxos, {
    chainId: coin.system_id,
    nextBlockHeight: (await readChain(coin, context)) + 1,
  });

  if (
    fundingApproval.systemId !== coin.system_id ||
    fundingApproval.changeAddress !== changeAddress ||
    fundingApproval.identity.txid !== subject.txid ||
    fundingApproval.identity.outputIndex !== subject.vout ||
    fundingApproval.identity.identityAddress !== subject.address ||
    !new BigNumber(fundingApproval.maxFee).eq(new BigNumber(maxFee).times('100000000'))
  ) {
    throw new Error('Prepared funding differs from the selected identity, payment source, or fee limit.');
  }

  // An address-index response is only a list of candidates. Bind the actual
  // verified prevout scripts to the selected source, including ordinary edits
  // and transfers that leave funds behind. Another identity controlled by the
  // same key is still a different payment source.
  const returnedInputs = new Set(returningFunds ? funds.utxos.map(input => `${input.txid}:${input.outputIndex}`) : []);

  for (const input of built.utxos) {
    if (input.txid === subject.txid && input.outputIndex === subject.vout) continue;

    identityOutputAmounts(
      {value: input.satoshis, script: Buffer.from(input.script, 'hex')},
      coin.system_id,
      returnedInputs.has(`${input.txid}:${input.outputIndex}`) ? subject.address : fundingAddress,
    );
  }

  if (
    !(built.deltas instanceof Map) ||
    !built.deltas.has(coin.system_id) ||
    [...built.deltas].some(([currency, amount]) => currency !== coin.system_id && !new BigNumber(amount.toString()).isZero())
  ) {
    throw new Error('Unable to verify the identity update fee currency.');
  }

  const delta = new BigNumber(built.deltas.get(coin.system_id).toString());
  const fee = delta.negated().dividedBy('100000000');

  if (!delta.isInteger() || !fee.isFinite() || !fee.isGreaterThan(0) || fee.isGreaterThan(maxFee)) {
    throw new Error('The identity update fee is outside the permitted range.');
  }

  if (!delta.negated().eq(fundingApproval.nativeFee)) {
    throw new Error('The displayed fee does not match the verified transaction fee. Nothing was sent.');
  }

  const transaction = Transaction.fromHex(built.hex, networks.verus);
  if (built.hex.length / 2 + transaction.ins.length * 1024 > 2000000) {
    throw new Error('These identity funds require a transaction that is too large. Consolidate the funds before transferring this identity.');
  }

  const inputKeys = transaction.ins.map(input => `${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`);
  if (new Set(inputKeys).size !== inputKeys.length)
    throw new Error('The transaction contains duplicate inputs. Nothing was sent.');

  const plannedIdentity = built.identity;
  if (plannedIdentity.toBuffer().toString('hex') !== expectedIdentityHex)
    throw new Error('Prepared identity differs from the changes you requested.');

  const expectedIdentityScript = IdentityScript.fromIdentity(plannedIdentity).toBuffer();
  if (transaction.outs.filter(output => output.value === 0 && Buffer.from(output.script).equals(expectedIdentityScript)).length !== 1) {
    throw new Error('The transaction does not contain the identity changes you requested.');
  }

  // Bind the library's approval to this flow's own intent. An internally
  // balanced transaction must still return exactly the reviewed identity funds
  // to the user's main address, without adding any other explicit payments.
  const expectedOutputs = [{value: 0, script: expectedIdentityScript}];
  if (returningFunds) {
    const expectedReturn = new Map(funds.balances);
    if (fundingAddress === subject.address) {
      expectedReturn.set(coin.system_id, (expectedReturn.get(coin.system_id) || new BigNumber(0)).plus(delta));
    }

    expectedOutputs.push(...transferOutput(coin.system_id, returnAddress, expectedReturn, height));
  }

  const approvedOutputs = Transaction.fromHex(fundingApproval.unfundedTxHex, networks.verus).outs;
  if (
    approvedOutputs.length !== expectedOutputs.length ||
    approvedOutputs.some((output, index) =>
      output.value !== expectedOutputs[index].value ||
      !Buffer.from(output.script).equals(expectedOutputs[index].script))
  ) {
    throw new Error('The transaction payments do not match the identity funds and return address you selected.');
  }

  // Display amounts from the verified transaction and keep signing data private.
  const losesControl = !canSign(plannedIdentity, signingAddress);
  const warnings = [];

  if (model.locked)
    warnings.push('The existing identity spending lock stays in place. Transferring the identity does not unlock its funds.');

  if (subject.identity.hasTokenizedIdControl()) {
    warnings.push('This identity has a control token. Its holder keeps recovery and revocation powers; this update does not transfer the control token.');
  }

  const remainingFunds = new Map(funds?.balances || []);
  const nativeFee = fee.times('100000000');

  if (mode === 'transfer' && fundingAddress === subject.address) {
    const remaining = (remainingFunds.get(coin.system_id) || new BigNumber(0)).minus(nativeFee);
    if (remaining.isNegative()) throw new Error('The transfer fee exceeds this identity’s verified funds.');
    remainingFunds.set(coin.system_id, remaining);
  }

  const fundingChangeValues = new Map();

  if (returningFunds && fundingAddress !== subject.address) {
    const subjectInputs = new Set(funds.utxos.map(input => `${input.txid}:${input.outputIndex}`));

    for (const input of built.utxos) {
      if (
        subjectInputs.has(`${input.txid}:${input.outputIndex}`) ||
        (input.txid === subject.txid && input.outputIndex === subject.vout)
      ) continue;

      addIdentityAmounts(fundingChangeValues, identityOutputAmounts(
        {value: input.satoshis, script: Buffer.from(input.script, 'hex')},
        coin.system_id,
        fundingAddress,
      ));
    }

    fundingChangeValues.set(coin.system_id, (fundingChangeValues.get(coin.system_id) || new BigNumber(0)).minus(nativeFee));
  }

  const returnedFunds = returnFunds ? await describeFunds(remainingFunds, coin, context) : [];
  const transferredFunds = mode === 'transfer' && !returnFunds ? await describeFunds(remainingFunds, coin, context) : [];
  const fundingChange = await describeFunds(fundingChangeValues, coin, context);
  const nativeTotalCost = fee.plus(mode === 'transfer' && !returnFunds
    ? (remainingFunds.get(coin.system_id) || new BigNumber(0)).dividedBy('100000000')
    : 0).toFixed();

  await resolveLabels(coin, plannedIdentity, names, context);

  const review = freeze({
    mode,
    before,
    after,
    displayName: subject.name,
    identityAddress: subject.address,
    chainTicker: coin.id,
    systemId: coin.system_id,
    networkName: coin.display_ticker || coin.display_name || coin.id,
    isTestnet: coin.testnet === true,
    identityNames: names,
    recipientName,
    usesRecipientPrivateAddress,
    fee: fee.toFixed(),
    feeCurrency: coin.display_ticker || coin.display_name || coin.id,
    fundingAddress,
    fundingName: names[fundingAddress] || source.fundingName,
    signingAddress,
    losesControl,
    warnings,
    returnFunds,
    returnAddress: returnFunds ? returnAddress : null,
    returnedFunds,
    transferredFunds,
    fundingChange,
    nativeTotalCost,
    changeAddress,
    changeName: returningFunds && fundingAddress === subject.address
      ? 'Main wallet address'
      : names[fundingAddress] || source.fundingName,
  });
  const plan = Object.freeze({review});
  const signingInputs = freeze(built.utxos.map(input => ({
    address: input.address,
    txid: input.txid,
    outputIndex: input.outputIndex,
    script: input.script,
    satoshis: input.satoshis,
    height: input.height,
    blocktime: input.blocktime,
  })));

  plans.set(plan, {
    scope: {...context.sessionScope},
    coin,
    subject,
    signingAddress,
    snapshots: [...snapshots.values()],
    fundsSnapshot: funds?.snapshot,
    txHex: built.hex,
    utxos: signingInputs,
    fundingApproval,
    expiryHeight: transaction.expiryHeight,
    attempted: false,
    txid: null,
    sent: false,
  });

  return plan;
};

const unsignedHex = hex => {
  const transaction = Transaction.fromHex(hex, networks.verus);
  for (const input of transaction.ins) input.script = Buffer.alloc(0);

  return transaction.toHex();
};

const broadcastUnknown = txid => Object.assign(
  fail('BROADCAST_UNKNOWN', `Delivery of identity update ${txid} could not be confirmed. Check its status before starting a new review.`),
  {txid, submitted: true},
);

/** Sign the reviewed transaction and allow one broadcast attempt per plan. */
export const sendIdentityUpdate = async (plan, requestContext) => {
  const context = captureIdentityUpdateContext(requestContext);
  const prepared = plans.get(plan);
  assertOwner(prepared, context);

  const key = `${prepared.scope.accountHash}:${prepared.coin.system_id}:${prepared.subject.address}`;
  if (activeSends.has(key)) throw new Error('This identity update is already being sent.');
  if (prepared.sent) return {txid: prepared.txid};
  if (prepared.attempted) throw broadcastUnknown(prepared.txid);

  activeSends.add(key);

  try {
    const {coin} = prepared;
    const endpoint = VrpcProvider.getEndpoint(coin.system_id);
    const height = await readChain(coin, context);

    if (!prepared.expiryHeight || height + 1 >= prepared.expiryHeight) {
      throw fail('REVIEW_CHANGED', 'This fee review has expired. Review the identity update again.');
    }

    const privateKey = await guarded(context, () => requestPrivKey(coin.id, 'vrpc', context));
    if (ECPair.fromWIF(privateKey, networks.verus).getAddress() !== prepared.signingAddress) {
      throw new Error('The signing key does not match the wallet used for this review.');
    }

    // Authentication may take time. Recheck the reviewed identities and funds.
    await inBatches(prepared.snapshots, snapshot => assertSnapshotCurrent(coin, snapshot, context));
    await inBatches(prepared.utxos, async input => {
      const unspent = rpcResult(await guarded(context, () => endpoint.getTxOut(input.txid, input.outputIndex, true)));
      if (!unspent) {
        throw fail('REVIEW_CHANGED', 'Funds or the identity changed after review. Review the update again.');
      }

      assertIdentityUpdateInputMaturity(prepared.fundingApproval, input, unspent);
    });

    if (prepared.fundsSnapshot !== undefined) {
      let current;

      try {
        current = await fundSnapshot(coin, prepared.subject, context);
      } catch (error) {
        assertContext(context);
        throw fail('REVIEW_CHANGED', `Identity funds could not be confirmed after review. Review this transfer again. ${error.message || ''}`);
      }

      if (current.snapshot !== prepared.fundsSnapshot) {
        throw fail('REVIEW_CHANGED', 'Identity funds changed after review. Review the transfer and its amounts again.');
      }
    }

    const built = {hex: prepared.txHex, utxos: prepared.utxos, fundingApproval: prepared.fundingApproval};
    const chainContext = {...context, systemId: coin.system_id};
    let lockContext = await assertIdentityUpdateAuthorityLocks(chainContext, built);
    if (lockContext.nextBlockHeight >= prepared.expiryHeight) {
      throw fail('REVIEW_CHANGED', 'This fee review has expired. Review the identity update again.');
    }

    assertContext(context);
    verifyIdentityUpdateFunding(prepared.fundingApproval, prepared.txHex, prepared.utxos, lockContext);
    const signedHex = signUpdateIdentityTx(
      coin.system_id,
      prepared.txHex,
      copy(prepared.utxos),
      prepared.utxos.map(() => [privateKey]),
      prepared.fundingApproval,
      lockContext,
    );

    if (unsignedHex(signedHex) !== unsignedHex(prepared.txHex)) {
      throw new Error('The signed transaction differs from your approved update. Nothing was sent.');
    }

    const signed = Transaction.fromHex(signedHex, networks.verus);
    if (signedHex.length / 2 > 2000000) {
      throw new Error('The signed transfer is too large. Consolidate the identity funds before transferring it.');
    }

    if (signed.ins.some(input => !input.script.length)) {
      throw new Error('The identity update is missing a required signature. Nothing was sent.');
    }

    // Verify the exact signed bytes at the current height before submission.
    lockContext = await assertIdentityUpdateAuthorityLocks(chainContext, built);
    if (lockContext.nextBlockHeight >= prepared.expiryHeight) {
      throw fail('REVIEW_CHANGED', 'The reviewed transaction expired before submission. Start a new review.');
    }

    verifyIdentityUpdateFunding(prepared.fundingApproval, signedHex, prepared.utxos, lockContext);
    assertContext(context);

    prepared.txid = signed.getId();

    // The plan is consumed at the RPC boundary, even if delivery is uncertain.
    try {
      const result = rpcResult(await guarded(context, () => {
        prepared.attempted = true;
        return endpoint.sendRawTransaction(signedHex);
      }));
      if (result !== prepared.txid) throw new Error('The server returned a different transaction ID.');

      prepared.sent = true;
      return {txid: prepared.txid};
    } catch (error) {
      try {
        assertContext(context);
      } catch (contextError) {
        error = contextError;
      }

      if (!prepared.attempted) throw error;
      if (error?.code === 'SESSION_CHANGED') {
        throw Object.assign(error, {txid: prepared.txid, submitted: true});
      }

      throw broadcastUnknown(prepared.txid);
    }
  } finally {
    activeSends.delete(key);
  }
};
