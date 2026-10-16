// Keep the installed RPC client, primitives, transaction builder, signer and
// Mobile orchestration real. Only device storage/authentication and RPC I/O are
// replaced; persisted records still use the wallet's actual encryption codec.
const mockState = {authentication: {activeAccount: {accountHash: 'sdk-account', id: 'sdk-profile'}, sessionEpoch: 1}, coins: {activeCoinList: []}};
const mockEncryptedJobs = new Map();
const mockPassword = 'offline-registration-test-password';
let mockClient;
let mockWif;

jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState, dispatch: jest.fn()}}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: async () => mockWif}));
jest.mock('../../crypto/randomBytes', () => ({
  randomBytes: async length => require('crypto').randomBytes(length),
}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    getVerusIdInterface: () => mockClient,
    getEndpoint: () => mockClient.interface,
  },
}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/verusid', () => ({linkVerusId: jest.fn()}));
jest.mock('../../../actions/actionCreators', () => ({setUserCoins: coins => ({type: 'set-user-coins', payload: {activeCoinsForUser: coins}})}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  clearChainLifecycle: jest.fn(), refreshActiveChainLifecycles: jest.fn(),
}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/registration', () => {
  const read = id => {
    const {decryptkey} = require('../../seedCrypt');
    return JSON.parse(decryptkey(mockPassword, mockEncryptedJobs.get(id)));
  };
  const save = async job => {
    const {encryptkey} = require('../../seedCrypt');
    const previous = mockEncryptedJobs.has(job.id) ? read(job.id) : null;
    const saved = {...job, revision: (previous?.revision || 0) + 1};
    mockEncryptedJobs.set(job.id, await encryptkey(mockPassword, JSON.stringify(saved)));
    return read(job.id);
  };
  return {
    getRegistrationJobs: async () => Object.fromEntries([...mockEncryptedJobs.keys()].map(id => [id, read(id)])),
    getRegistrationJob: async id => read(id),
    saveRegistrationJob: save,
    updateRegistrationJob: async (id, update) => save(update(read(id))),
    publishRegistrationState: jest.fn(),
  };
});

const {crypto, ECPair, networks, script, Transaction, TransactionBuilder} = require('@bitgo/utxo-lib');
const {
  BigNumber: BN, CurrencyOptions, CurrencyValueMap, EVALS, Identity, IdentityID, IdentityScript, KeyID,
  OptCCParams, SmartTransactionScript, TokenOutput, TxDestination, nameAndParentAddrToIAddr,
} = require('verus-typescript-primitives');
const {VerusIdInterface} = require('verusid-ts-client');
const {decryptkey, encryptkey} = require('../../seedCrypt');
const {
  createRegistrationContext, resolveRegistration, prepareCommitment, approveCommitment,
  reconcileRegistration, prepareRegistration, approveRegistration,
  linkRegisteredIdentity, retryBroadcast,
} = require('../../identityRegistration');
const {linkVerusId} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {publishRegistrationState} = require('../../../actions/actions/services/dispatchers/verusid/registration');

test.each([
  {description: 'completes native registration', branch: 'native', tokenProof: null},
  {description: 'completes token-burn registration', branch: 'token-burn', tokenProof: 1},
  {description: 'completes token-payment registration', branch: 'token-payment', tokenProof: 2},
  {description: 'completes native registration using only a linked identity balance', branch: 'native', tokenProof: null, identityFunding: true},
  {description: 'rejects tampered cached funding during approval refresh', branch: 'native', tokenProof: null, sourceFailure: 'tampered'},
  {description: 'rejects cached funding spent after preparation during approval refresh', branch: 'native', tokenProof: null, sourceFailure: 'spent'},
  ...['uncontrolled', 'locked', 'revoked'].map(authorityStatus => ({
    description: `rejects ${authorityStatus} identity funding before payment`,
    branch: 'native', tokenProof: null, identityFunding: true, authorityStatus,
  })),
  ...['excess-fee', 'redirected-change', 'lost-reserve'].map(guardAttack => ({
    description: `independently blocks ${guardAttack} with coordinated signed bytes and a faulty SDK validator`,
    branch: guardAttack === 'lost-reserve' ? 'token-burn' : 'native',
    tokenProof: guardAttack === 'lost-reserve' ? 1 : null, guardAttack,
  })),
])('real SDK $description across encrypted storage and block confirmations', async ({branch, tokenProof, identityFunding, authorityStatus, sourceFailure, guardAttack}) => {
  jest.clearAllMocks();
  mockEncryptedJobs.clear();
  const system = nameAndParentAddrToIAddr('VRSC');
  const token = nameAndParentAddrToIAddr('community', system);
  const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 7), networks.verus);
  const address = key.getAddress();
  const fundingAddress = identityFunding ? nameAndParentAddrToIAddr('t1', system) : address;
  mockWif = key.toWIF();
  const hashAt = height => height.toString(16).padStart(64, '0');
  let tip = 100;
  const sourceBuilder = new TransactionBuilder(networks.verus);
  sourceBuilder.setVersion(4);
  sourceBuilder.setVersionGroupId(0x892f2085);
  sourceBuilder.setExpiryHeight(500);
  sourceBuilder.addInput(Buffer.alloc(32, 9), 0);
  const transparentFundingScript = script.pubKeyHash.output.encode(crypto.hash160(key.getPublicKeyBuffer()));
  const fundingDestination = new TxDestination(identityFunding
    ? IdentityID.fromAddress(fundingAddress)
    : KeyID.fromAddress(address));
  const nativeParams = () => new OptCCParams({
    version: new BN(3), evalCode: new BN(EVALS.EVAL_NONE), m: new BN(1), n: new BN(1),
    destinations: [fundingDestination], vData: [],
  });
  const fundingScript = identityFunding
    ? new SmartTransactionScript(nativeParams(), nativeParams()).toBuffer()
    : transparentFundingScript;
  sourceBuilder.addOutput(fundingScript, 200000000);
  if (tokenProof != null) {
    const destination = new TxDestination(KeyID.fromAddress(address));
    const reserve = new TokenOutput({
      version: new BN(1),
      values: new CurrencyValueMap({valueMap: new Map([[token, new BN(200000000)]])}),
    });
    const params = (evalCode, vData = []) => new OptCCParams({
      version: new BN(3), evalCode: new BN(evalCode), m: new BN(1), n: new BN(1),
      destinations: [destination], vData,
    });
    sourceBuilder.addOutput(new SmartTransactionScript(
      params(EVALS.EVAL_NONE), params(EVALS.EVAL_RESERVE_OUTPUT, [reserve.toBuffer()]),
    ).toBuffer(), 0);
  }
  const coinUnits = atomic => {
    const padded = String(atomic).padStart(9, '0');
    return `${padded.slice(0, -8)}.${padded.slice(-8)}`;
  };
  const fundingCurrencies = output => {
    if (output.script.equals(fundingScript)) return {};
    try {
      const parsed = new SmartTransactionScript();
      parsed.fromBuffer(output.script);
      const condition = parsed.paramsOptCC;
      if (!condition.destinations.some(destination => destination.toAddress() === fundingAddress)) return null;
      if (condition.evalCode.eqn(EVALS.EVAL_NONE)) return {};
      if (!condition.evalCode.eqn(EVALS.EVAL_RESERVE_OUTPUT)) return null;
      const reserve = new TokenOutput();
      reserve.fromBuffer(condition.vData[0]);
      return Object.fromEntries([...reserve.reserveValues.valueMap]
        .map(([currencyID, amount]) => [currencyID, coinUnits(amount.toString(10))]));
    } catch (_) {
      return null;
    }
  };
  const source = sourceBuilder.buildIncomplete();
  const transactions = new Map([[source.getId(), {transaction: source, height: 10}]]);
  let fundingAuthority;
  if (identityFunding) {
    const primaryKey = authorityStatus === 'uncontrolled'
      ? ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 8), networks.verus)
      : key;
    const identity = new Identity({
      version: new BN(3), flags: new BN(authorityStatus === 'locked' ? 2 : authorityStatus === 'revoked' ? 0x8000 : 0),
      minSigs: new BN(1), primaryAddresses: [KeyID.fromAddress(primaryKey.getAddress())],
      name: 't1', parent: IdentityID.fromAddress(system), systemId: IdentityID.fromAddress(system),
      revocationAuthority: IdentityID.fromAddress(fundingAddress), recoveryAuthority: IdentityID.fromAddress(fundingAddress),
      unlockAfter: new BN(0),
    });
    const authorityBuilder = new TransactionBuilder(networks.verus);
    authorityBuilder.setVersion(4);
    authorityBuilder.setVersionGroupId(0x892f2085);
    authorityBuilder.setExpiryHeight(500);
    authorityBuilder.addInput(Buffer.alloc(32, 51), 0);
    authorityBuilder.addOutput(IdentityScript.fromIdentity(identity).toBuffer(), 0);
    const authorityTransaction = authorityBuilder.buildIncomplete();
    transactions.set(authorityTransaction.getId(), {transaction: authorityTransaction, height: 20});
    fundingAuthority = {identity: identity.toJson('VRSC'), txid: authorityTransaction.getId(), vout: 0, blockheight: 20};
    // There is no transparent balance: the only positive-value source belongs
    // to t1@, while its zero-value definition is evidence, never a fee input.
    expect(source.outs.some(output => output.script.equals(transparentFundingScript))).toBe(false);
  }
  const spent = new Set();
  let liveSourceSpent = false;
  const mine = txid => {
    tip += 1;
    transactions.get(txid).height = tip;
  };
  const rpcCalls = [];
  let broadcastCount = 0;

  mockClient = new VerusIdInterface(system, 'https://offline.invalid', undefined, async rpcRequest => {
    rpcCalls.push(rpcRequest.method);
    const [first, second] = rpcRequest.params || [];
    const ok = result => ({id: rpcRequest.id, error: null, result});
    switch (rpcRequest.method) {
      case 'getinfo':
        return ok({blocks: tip, longestchain: tip, chainid: system});
      case 'getcurrency': {
        expect([system, ...(tokenProof == null ? [] : [token])]).toContain(first);
        const native = {
          version: 1, name: 'VRSC', parent: new IdentityID(Buffer.alloc(20)).toAddress(),
          currencyid: system, systemid: system, options: CurrencyOptions.PBAAS,
          proofprotocol: 1, startblock: 0, endblock: 0, blocktime: 60,
          idregistrationfees: 1, idreferrallevels: 0, idimportfees: 0.01,
        };
        return ok(first === token ? {
          ...native, name: 'community', parent: system, currencyid: token,
          options: CurrencyOptions.TOKEN, proofprotocol: tokenProof,
        } : native);
      }
      case 'getidentity':
        if (first === fundingAddress && fundingAuthority) return ok(fundingAuthority);
        return {id: rpcRequest.id, result: null, error: {code: -5, message: 'Identity not found'}};
      case 'getaddressutxos':
        expect(first.addresses).toEqual([fundingAddress]);
        return ok([...transactions].flatMap(([txid, entry]) => entry.transaction.outs
          .map((output, outputIndex) => ({output, outputIndex, currencyvalues: fundingCurrencies(output)}))
          .filter(({currencyvalues, outputIndex}) => currencyvalues !== null && !spent.has(`${txid}:${outputIndex}`))
          .map(({output, outputIndex, currencyvalues}) => ({
            txid, outputIndex, isspendable: identityFunding ? 1 : true, satoshis: output.value,
            script: output.script.toString('hex'), currencyvalues,
          }))));
      case 'getrawtransaction': {
        const entry = transactions.get(first);
        if (!entry) return {id: rpcRequest.id, result: null, error: {code: -5, message: 'No such transaction'}};
        return ok(second ? {
          txid: first, hex: entry.transaction.toHex(),
          confirmations: entry.height ? tip - entry.height + 1 : 0,
          ...(entry.height ? {blockhash: hashAt(entry.height)} : {}),
        } : entry.transaction.toHex());
      }
      case 'gettxout': {
        const entry = transactions.get(first);
        const output = entry?.transaction.outs[second];
        if (!output || spent.has(`${first}:${second}`) ||
          (liveSourceSpent && first === source.getId() && second === 0)) return ok(null);
        const atomic = String(output.value).padStart(9, '0');
        return ok({
          bestblock: hashAt(tip), confirmations: entry.height ? tip - entry.height + 1 : 0,
          value: `${atomic.slice(0, -8)}.${atomic.slice(-8)}`, coinbase: false,
          scriptPubKey: {hex: output.script.toString('hex')},
        });
      }
      case 'getblock': {
        const height = first.length > 10 ? parseInt(first, 16) : Number(first);
        return ok({
          hash: hashAt(height), height, confirmations: tip - height + 1,
          tx: [...transactions].filter(([, entry]) => entry.height === height).map(([txid]) => txid),
        });
      }
      case 'sendrawtransaction': {
        broadcastCount += 1;
        const transaction = Transaction.fromHex(first, networks.verus);
        const persisted = JSON.parse(decryptkey(mockPassword, [...mockEncryptedJobs.values()][0]));
        const stage = persisted.registration?.signedHex === first ? 'registration' : 'commitment';
        expect(persisted[stage].signedHex).toBe(first);
        expect(persisted[stage].txid).toBe(transaction.getId());
        expect(mockClient.validateIdentityRegistrationTransaction(persisted[stage].prepared, first))
          .toMatchObject({valid: true, signingStatus: 'complete', txid: transaction.getId()});
        transactions.set(transaction.getId(), {transaction, height: 0});
        transaction.ins.forEach(input => spent.add(`${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`));
        return ok(transaction.getId());
      }
      default:
        throw new Error(`Unexpected offline RPC: ${rpcRequest.method}`);
    }
  });

  const context = createRegistrationContext();
  const assertGuardBlocksCorruptedSignature = async (stage, paymentReview) => {
    const originalSign = mockClient.signIdentityRegistrationTransaction.bind(mockClient);
    const broadcastBefore = broadcastCount;
    jest.spyOn(mockClient, 'signIdentityRegistrationTransaction').mockImplementation(args => {
      const signed = originalSign(args);
      const changed = Transaction.fromHex(signed.hex, networks.verus);
      const changeIndex = args.transaction.outputPlan.findIndex(output => output.role === 'change');
      expect(changeIndex).toBeGreaterThanOrEqual(0);
      const change = changed.outs[changeIndex];
      if (guardAttack === 'excess-fee') {
        const lost = change.value - 1;
        change.value = 1;
        args.transaction.nativeFee = new BN(args.transaction.nativeFee).add(new BN(lost)).toString(10);
        args.transaction.outputPlan[changeIndex].value = '1';
        args.transaction.outputPlan[changeIndex].values[system] = '1';
      } else if (guardAttack === 'redirected-change') {
        const otherKey = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 8), networks.verus);
        change.script = script.pubKeyHash.output.encode(crypto.hash160(otherKey.getPublicKeyBuffer()));
        args.transaction.changeAddress = otherKey.getAddress();
      } else {
        // Preserve every native unit, but discard all token change. Coordinate
        // the output metadata so only decoding the actual input reserve reveals
        // the loss; a plan-relative validator is deliberately bypassed below.
        change.script = transparentFundingScript;
        args.transaction.outputPlan[changeIndex].values = {[system]: String(change.value)};
      }
      args.transaction.outputPlan[changeIndex].scriptHex = change.script.toString('hex');
      const unsigned = changed.clone();
      unsigned.ins.forEach(input => {input.script = Buffer.alloc(0);});
      args.transaction.txHex = unsigned.toHex();
      return {...signed, hex: changed.toHex(), txid: changed.getId()};
    });
    // Model a selector/signer/plan-validator defect agreeing on the same bad
    // plan. The independent SDK funding gate must still reject it.
    jest.spyOn(mockClient, 'validateIdentityRegistrationTransaction').mockImplementation((_prepared, hex) => ({
      valid: true, signingStatus: 'complete', txid: Transaction.fromHex(hex, networks.verus).getId(),
    }));
    const approve = stage === 'commitment' ? approveCommitment : approveRegistration;
    await expect(approve(paymentReview.jobId, paymentReview.approvalToken, context))
      .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(broadcastCount).toBe(broadcastBefore);
    // A durable corrupt receipt must remain blocked on retry too, even after
    // successful SDK validation was cached on the first attempt.
    await expect(retryBroadcast(paymentReview.jobId, context))
      .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(broadcastCount).toBe(broadcastBefore);
  };
  const request = {
    systemId: system, chainTicker: 'VRSC', rootSystemName: 'VRSC',
    fundingAddress, signingAddress: address,
    keyChannel: 'vrpc', name: tokenProof == null ? 'Alice' : 'Alice.community@',
  };
  if (authorityStatus) {
    await expect((async () => {
      const resolved = await resolveRegistration(request, context);
      return prepareCommitment({request, approvedCosts: resolved.quote.totalOperationRequired}, context);
    })()).rejects.toMatchObject({code: authorityStatus === 'locked' ? 'LOCKED_AUTHORITY' : 'FUNDING_AUTHORIZATION_REQUIRED'});
    expect(mockEncryptedJobs.size).toBe(0);
    expect(broadcastCount).toBe(0);
    return;
  }
  const resolved = await resolveRegistration(request, context);
  const registrationCosts = tokenProof == null
    ? {[system]: '100000000'}
    : {[system]: tokenProof === 1 ? '1020000' : '1000000', [token]: '100000000'};
  expect(resolved.quote.branch).toBe(branch);
  expect(resolved.quote.totalOperationRequired).toEqual({
    ...registrationCosts, [system]: new BN(registrationCosts[system]).addn(10000).toString(10),
  });
  const review = await prepareCommitment({request, approvedCosts: resolved.quote.totalOperationRequired}, context);
  expect(broadcastCount).toBe(0);
  const encrypted = mockEncryptedJobs.get(review.jobId);
  const persisted = JSON.parse(decryptkey(mockPassword, encrypted));
  expect(review.identity.parent).toBe(tokenProof == null ? system : token);
  expect(persisted.reservation.parentID).toBe(tokenProof == null ? system : token);
  expect(encrypted).not.toContain(persisted.reservation.reservationHex);
  expect(JSON.stringify(persisted)).not.toContain(mockWif);
  expect(JSON.stringify(review)).not.toContain(persisted.reservation.reservationHex);
  expect(persisted.commitment.prepared.prevouts[0]).toMatchObject({
    txid: source.getId(), rawTransaction: source.toHex(), value: '200000000',
  });
  if (identityFunding) {
    expect(persisted.signingAddress).toBe(address);
    expect(persisted.fundingAddress).toBe(fundingAddress);
    expect(persisted.identity.primaryaddresses).toEqual([address]);
    expect(persisted.reservation.controller).toBe(address);
    expect(persisted.commitment.prepared.changeAddress).toBe(fundingAddress);
    expect(persisted.commitment.prepared.identityAuthorities).toEqual([{
      identityID: fundingAddress, primaryAddresses: [address], minimumSignatures: 1, revoked: false,
    }]);
    expect(persisted.commitment.prepared.requiredSignatures[0].requirements[0])
      .toMatchObject({identityID: fundingAddress, threshold: 1, eligibleKeyIDs: [address]});
    expect(persisted.commitment.prepared.prevouts.some(input => input.txid === fundingAuthority.txid)).toBe(false);
  }
  expect(mockClient.validateIdentityRegistrationTransaction(persisted.commitment.prepared))
    .toMatchObject({valid: true, signingStatus: 'unsigned'});

  if (sourceFailure) {
    if (sourceFailure === 'tampered') {
      const changedSource = Transaction.fromHex(source.toHex(), networks.verus);
      changedSource.outs[0].value += 1;
      persisted.commitment.prepared.prevouts[0].rawTransaction = changedSource.toHex();
      mockEncryptedJobs.set(review.jobId, await encryptkey(mockPassword, JSON.stringify(persisted)));
    } else {
      // Address discovery can race a spend. Keep its response unchanged so the
      // refreshed builder must detect unavailability through live gettxout.
      liveSourceSpent = true;
    }
    const encryptedBeforeApproval = mockEncryptedJobs.get(review.jobId);
    const signing = jest.spyOn(mockClient, 'signIdentityRegistrationTransaction');
    rpcCalls.length = 0;
    await expect(approveCommitment(review.jobId, review.approvalToken, context))
      .rejects.toMatchObject({code: sourceFailure === 'tampered' ? 'PREVOUT_MISMATCH' : 'FUNDING_SPENT'});
    expect(signing).not.toHaveBeenCalled();
    expect(broadcastCount).toBe(0);
    expect(mockEncryptedJobs.get(review.jobId)).toBe(encryptedBeforeApproval);
    // No download replaces the saved bytes: their hash and current spend state
    // must still be verified even when the raw transaction is reused.
    expect(rpcCalls).not.toContain('getrawtransaction');
    if (sourceFailure === 'spent') expect(rpcCalls).toContain('gettxout');
    return;
  }

  if (guardAttack && guardAttack !== 'lost-reserve') {
    await assertGuardBlocksCorruptedSignature('commitment', review);
    return;
  }

  const submitted = await approveCommitment(review.jobId, review.approvalToken, context);

  expect(submitted.status).toBe('commitment_broadcast');
  expect(broadcastCount).toBe(1);
  const saved = JSON.parse(decryptkey(mockPassword, mockEncryptedJobs.get(review.jobId)));
  expect(saved.reservation.reservationHex).toBe(persisted.reservation.reservationHex);
  expect(saved.commitment.txid).not.toBe(Transaction.fromHex(saved.commitment.prepared.txHex, networks.verus).getId());
  expect(mockClient.validateIdentityRegistrationTransaction(saved.commitment.prepared, saved.commitment.signedHex))
    .toMatchObject({valid: true, signingStatus: 'complete', txid: saved.commitment.txid});

  // The restored approval still rejects altered output values before signatures.
  const altered = Transaction.fromHex(saved.commitment.signedHex, networks.verus);
  altered.outs[saved.commitment.vout].value += 1;
  expect(() => mockClient.validateIdentityRegistrationTransaction(saved.commitment.prepared, altered.toHex())).toThrow();

  // Confirmation enables the second, independently approved payment. The old
  // funding output is spent; the SDK must use the commitment and its change.
  expect(spent.has(`${source.getId()}:0`)).toBe(true);
  mine(saved.commitment.txid);
  const ready = await reconcileRegistration(review.jobId, context);
  expect(ready.status).toBe('commitment_confirmed');
  expect(linkVerusId).not.toHaveBeenCalled();
  const registrationReview = await prepareRegistration({jobId: review.jobId}, context);
  expect(registrationReview.status).toBe('registration_prepared');
  expect(registrationReview.quote.totalRequired).toEqual(registrationCosts);
  expect(broadcastCount).toBe(1);
  const preparedReveal = JSON.parse(decryptkey(mockPassword, mockEncryptedJobs.get(review.jobId)));
  // Check the actual reveal output against the daemon's current registeridentity
  // defaults, including the optional content omitted by Mobile's makeIdentity.
  const revealTransaction = Transaction.fromHex(preparedReveal.registration.prepared.txHex, networks.verus);
  const identityOutput = preparedReveal.registration.prepared.outputPlan.findIndex(output => output.role === 'identity');
  expect(identityOutput).toBeGreaterThanOrEqual(0);
  const revealIdentityScript = new IdentityScript();
  revealIdentityScript.fromBuffer(revealTransaction.outs[identityOutput].script);
  const revealIdentity = revealIdentityScript.getIdentity();
  expect(revealIdentity.toJson('VRSC')).toEqual({
    version: 3, flags: 0, minimumsignatures: 1, timelock: 0,
    name: 'Alice', parent: tokenProof == null ? system : token, systemid: system,
    identityaddress: review.identityAddress, primaryaddresses: [address],
    recoveryauthority: review.identityAddress, revocationauthority: review.identityAddress,
    contentmap: {}, contentmultimap: {},
  });
  expect(revealIdentity.privateAddresses || []).toEqual([]);
  expect(preparedReveal.registration.prepared.prevouts).toHaveLength(tokenProof == null ? 2 : 3);
  expect(preparedReveal.registration.prepared.prevouts[0]).toMatchObject({
    txid: saved.commitment.txid, vout: saved.commitment.vout, value: '0',
    rawTransaction: saved.commitment.signedHex,
  });
  expect(preparedReveal.registration.prepared.prevouts[tokenProof == null ? 1 : 2]).toMatchObject({
    txid: saved.commitment.txid, value: '199990000',
  });
  if (identityFunding) {
    expect(preparedReveal.registration.prepared.changeAddress).toBe(fundingAddress);
    expect(preparedReveal.registration.prepared.requiredSignatures[1].requirements[0])
      .toMatchObject({identityID: fundingAddress, threshold: 1, eligibleKeyIDs: [address]});
    expect(preparedReveal.registration.prepared.prevouts.some(input => input.txid === fundingAuthority.txid)).toBe(false);
  }
  if (tokenProof != null) {
    // This reserve-only zero-native output must survive the Mobile funding
    // filter; its actual token amount comes from the verified source script.
    expect(preparedReveal.registration.prepared.prevouts[1]).toMatchObject({
      txid: source.getId(), vout: 1, value: '0', values: {[system]: '0', [token]: '200000000'},
    });
    expect(preparedReveal.registration.prepared.outputPlan.map(output => output.role))
      .toContain(tokenProof === 1 ? 'burn' : 'issuer-payment');
    expect(preparedReveal.registration.prepared.outputPlan.find(output => output.role === 'change').values)
      .toEqual({[system]: tokenProof === 1 ? '198970000' : '198990000', [token]: '100000000'});
  }
  expect(mockClient.validateIdentityRegistrationTransaction(preparedReveal.registration.prepared))
    .toMatchObject({valid: true, signingStatus: 'unsigned'});

  if (guardAttack) {
    await assertGuardBlocksCorruptedSignature('registration', registrationReview);
    return;
  }

  const registered = await approveRegistration(review.jobId, registrationReview.approvalToken, context);
  expect(registered.status).toBe('registration_broadcast');
  expect(broadcastCount).toBe(2);
  expect(linkVerusId).not.toHaveBeenCalled();
  const signedReveal = JSON.parse(decryptkey(mockPassword, mockEncryptedJobs.get(review.jobId)));
  expect(signedReveal.reservation.reservationHex).toBe(persisted.reservation.reservationHex);
  expect(mockClient.validateIdentityRegistrationTransaction(signedReveal.registration.prepared, signedReveal.registration.signedHex))
    .toMatchObject({valid: true, signingStatus: 'complete', txid: signedReveal.registration.txid});
  expect(spent.has(`${saved.commitment.txid}:${saved.commitment.vout}`)).toBe(true);

  mine(signedReveal.registration.txid);
  const completed = await reconcileRegistration(review.jobId, context);
  expect(completed).toMatchObject({status: 'registered', linked: false});
  expect(linkVerusId).not.toHaveBeenCalled();
  expect(publishRegistrationState).not.toHaveBeenCalled();
  expect(await linkRegisteredIdentity(review.jobId, context)).toMatchObject({status: 'complete', linked: true});
  expect(linkVerusId).toHaveBeenCalledTimes(1);
  expect(linkVerusId).toHaveBeenCalledWith(review.identityAddress, review.displayName, 'VRSC', context);
  expect(publishRegistrationState).toHaveBeenCalledWith(context);
  await reconcileRegistration(review.jobId, context);
  expect(linkVerusId).toHaveBeenCalledTimes(1);
  expect(broadcastCount).toBe(2);
  expect(rpcCalls).not.toContain('registernamecommitment');
  expect(rpcCalls).not.toContain('registeridentity');
});
