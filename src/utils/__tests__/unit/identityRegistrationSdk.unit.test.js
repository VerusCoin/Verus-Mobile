// Keep the installed RPC client, primitives, transaction builder, signer and
// Mobile orchestration real. Only device storage/authentication and RPC I/O are
// replaced; persisted records use the wallet's actual compact storage and
// encryption codecs, then restore the full SDK transaction before each action.
const mockState = {authentication: {activeAccount: {accountHash: 'sdk-account', id: 'sdk-profile'}, sessionEpoch: 1}, coins: {activeCoinList: []}};
const mockEncryptedJobs = new Map();
const mockPassword = 'offline-registration-test-password';
let mockClient;
let mockWif;

const mockReadRecord = id => {
  const {decryptkey} = require('../../seedCrypt');

  return JSON.parse(decryptkey(mockPassword, mockEncryptedJobs.get(id)));
};

const mockWriteRecord = async (id, record) => {
  const {encryptkey} = require('../../seedCrypt');
  const encrypted = await encryptkey(mockPassword, JSON.stringify(record));

  mockEncryptedJobs.set(id, encrypted);
  return encrypted;
};

const mockWriteJob = job => {
  const {encodeRegistrationJob} = require('../../identityRegistration/storage');

  return mockWriteRecord(job.id, encodeRegistrationJob(job));
};

const mockReadJob = id => {
  const {decodeRegistrationJob} = require('../../identityRegistration/storage');

  return decodeRegistrationJob(mockReadRecord(id), {
    id,
    accountHash: mockState.authentication.activeAccount.accountHash,
    summaryOnly: false,
  });
};

const assertCompactPlans = id => {
  const record = mockReadRecord(id);

  // Supported plans store shared references rather than a full SDK object.
  // Check the actual size reduction as well as lossless reconstruction.
  expect(record.pools.plans.length).toBeGreaterThan(0);
  expect(record.pools.plans.every(plan => !Object.prototype.hasOwnProperty.call(plan, 'literal'))).toBe(true);
  expect(JSON.stringify(record).length).toBeLessThan(JSON.stringify(mockReadJob(id)).length);
};

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
  const read = mockReadJob;
  const save = async job => {
    const {encryptkey} = require('../../seedCrypt');
    const {encodeRegistrationJob, decodeRegistrationJob} = require('../../identityRegistration/storage');
    const {registrationApprovalToken} = require('../../identityRegistration/approval');
    const previous = mockEncryptedJobs.has(job.id) ? read(job.id) : null;
    const saved = {...job, revision: (previous?.revision || 0) + 1};
    const fullJson = JSON.stringify(saved);
    const encoded = encodeRegistrationJob(saved);
    const storageJson = JSON.stringify(encoded);
    const restored = decodeRegistrationJob(JSON.parse(storageJson), {
      id: saved.id,
      accountHash: saved.accountHash,
      summaryOnly: false,
    });

    // Every SDK stage, including native and reserve-currency payments, must
    // survive disk serialization without changing its approved intent or bytes.
    expect(encoded.format).toBe(2);
    expect(restored).toEqual(JSON.parse(fullJson));
    expect(registrationApprovalToken(restored)).toBe(registrationApprovalToken(saved));
    expect(JSON.stringify(saved)).toBe(fullJson);

    mockEncryptedJobs.set(job.id, await encryptkey(mockPassword, storageJson));
    return read(job.id);
  };
  return {
    getRegistrationJobSummaries: async () => Object.fromEntries([...mockEncryptedJobs.keys()].map(id => [id, read(id)])),
    getRegistrationJob: async id => read(id),
    saveRegistrationJob: save,
    updateRegistrationJob: async (id, update) => save(update(read(id))),
    removeRegistrationJob: async (id, revision) => {
      expect(read(id).revision).toBe(revision);
      mockEncryptedJobs.delete(id);
      return {jobId: id};
    },
    publishRegistrationState: jest.fn(),
  };
});

const {crypto, ECPair, networks, script, Transaction, TransactionBuilder} = require('@bitgo/utxo-lib');
const {
  BigNumber: BN, CurrencyOptions, CurrencyValueMap, EVALS, Identity, IdentityID, IdentityScript, KeyID,
  OptCCParams, SmartTransactionScript, TokenOutput, TxDestination, nameAndParentAddrToIAddr,
} = require('verus-typescript-primitives');
const {VerusIdInterface} = require('verusid-ts-client');
const VrpcRequestBatcher = require('../../vrpc/vrpcRequestBatcher').default;
const {
  createRegistrationContext, resolveRegistration, prepareCommitment, approveCommitment,
  reconcileRegistration, prepareRegistration, approveRegistration,
  linkRegisteredIdentity, retryBroadcast, refreshRegistrationReview, deleteRegistration,
} = require('../../identityRegistration');
const {linkVerusId} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {publishRegistrationState} = require('../../../actions/actions/services/dispatchers/verusid/registration');
const PRIVATE_ADDRESS = 'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa';

// Allow ten seconds for complete flows using real transport pacing and retries.
test.each([
  {description: 'completes native registration', branch: 'native', tokenProof: null},
  {description: 'deletes a confirmed receipt with incompatible saved funding approval', branch: 'native', tokenProof: null, deleteCompleted: true},
  {description: 'preserves the wallet private address through a commitment broadcast retry', branch: 'native', tokenProof: null, privateAddress: PRIVATE_ADDRESS, broadcastFailure: 'timeout'},
  {description: 'registers the wallet private address when paying from a linked identity', branch: 'native', tokenProof: null, privateAddress: PRIVATE_ADDRESS, identityFunding: true},
  {description: 'reviews the calculated fee for large reserve change', branch: 'native', tokenProof: null, reserveCurrencyCount: 75},
  ...['confirmed', 'expired', 'unsent', 'signature', 'change-address', 'intent'].map(historicalReceipt => ({
    description: `checks a historical low-fee ${historicalReceipt} receipt without relaxing broadcast validation`,
    branch: 'native', tokenProof: null, reserveCurrencyCount: 75, historicalReceipt,
  })),
  {description: 'completes token-burn registration', branch: 'token-burn', tokenProof: 1},
  {description: 'completes token-payment registration', branch: 'token-payment', tokenProof: 2},
  {description: 'completes native registration using only a linked identity balance', branch: 'native', tokenProof: null, identityFunding: true},
  ...[false, true].map(identityFunding => ({
    description: `completes ${identityFunding ? 'identity-funded' : 'native'} registration after batch rejection and a lost broadcast response`,
    branch: 'native', tokenProof: null, identityFunding, batchUnsupported: true, broadcastFailure: 'timeout',
  })),
  ...[false, true].flatMap(identityFunding => ['commitment', 'approval', 'registration', 'saved'].map(wrongSourceStage => ({
    description: `rejects another identity's funds for ${identityFunding ? 'identity' : 'R-address'} payment during ${wrongSourceStage}`,
    branch: 'native', tokenProof: null, identityFunding, wrongSourceStage,
  }))),
  ...['timeout', 'rpc-error', 'missing-response', 'mismatched-txid'].map(broadcastFailure => ({
    description: `reconciles an accepted commitment after ${broadcastFailure} through the SDK`,
    branch: 'native', tokenProof: null, broadcastFailure,
  })),
  {description: 'rejects tampered cached funding during approval refresh', branch: 'native', tokenProof: null, sourceFailure: 'tampered'},
  {description: 'rejects cached funding spent after preparation during approval refresh', branch: 'native', tokenProof: null, sourceFailure: 'spent'},
  ...['uncontrolled', 'locked', 'countdown', 'revoked'].map(authorityStatus => ({
    description: `rejects ${authorityStatus} identity funding before payment`,
    branch: 'native', tokenProof: null, identityFunding: true, authorityStatus,
  })),
  {description: 'accepts an identity countdown elapsed at the candidate block', branch: 'native', tokenProof: null, identityFunding: true, authorityStatus: 'elapsed-countdown'},
  ...[false, true].flatMap(batchUnsupported => ['commitment', 'registration'].map(authoritySpendStage => ({
    description: `blocks ${authoritySpendStage} approval when its cached authority is spent, with ${batchUnsupported ? 'fallback' : 'batch'} transport`,
    branch: 'native', tokenProof: null, identityFunding: true, authoritySpendStage, batchUnsupported,
  }))),
  ...['excess-fee', 'redirected-change', 'lost-reserve'].map(guardAttack => ({
    description: `independently blocks ${guardAttack} with coordinated signed bytes and a faulty SDK validator`,
    branch: guardAttack === 'lost-reserve' ? 'token-burn' : 'native',
    tokenProof: guardAttack === 'lost-reserve' ? 1 : null, guardAttack,
  })),
])('real SDK $description across encrypted storage and block confirmations', async ({branch, tokenProof, identityFunding, authorityStatus, authoritySpendStage, sourceFailure, guardAttack, broadcastFailure, reserveCurrencyCount, wrongSourceStage, historicalReceipt, privateAddress, deleteCompleted, batchUnsupported}) => {
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
  let fundingScript = identityFunding
    ? new SmartTransactionScript(nativeParams(), nativeParams()).toBuffer()
    : transparentFundingScript;
  if (reserveCurrencyCount) {
    // Preserving unrelated currencies makes change exceed the daemon's 2 KB
    // threshold even though the commitment itself is small.
    const reserve = new TokenOutput({
      version: new BN(1),
      values: new CurrencyValueMap({valueMap: new Map(Array.from({length: reserveCurrencyCount}, (_, index) => [
        nameAndParentAddrToIAddr(`reserve${index}`, system), new BN(100000000),
      ]))}),
    });
    fundingScript = new SmartTransactionScript(nativeParams(), new OptCCParams({
      ...nativeParams(), evalCode: new BN(EVALS.EVAL_RESERVE_OUTPUT), vData: [reserve.toBuffer()],
    })).toBuffer();
  }
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
  const registerAuthority = identity => {
    const builder = new TransactionBuilder(networks.verus);
    builder.setVersion(4);
    builder.setVersionGroupId(0x892f2085);
    builder.setExpiryHeight(500);
    builder.addInput(Buffer.alloc(32, 51), 0);
    builder.addOutput(IdentityScript.fromIdentity(identity).toBuffer(), 0);
    const transaction = builder.buildIncomplete();
    transactions.set(transaction.getId(), {transaction, height: 20});
    return {identity: identity.toJson('VRSC'), txid: transaction.getId(), vout: 0, blockheight: 20};
  };
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
      unlockAfter: new BN(authorityStatus === 'countdown' ? 101 : authorityStatus === 'elapsed-countdown' ? 100 : 0),
    });
    fundingAuthority = registerAuthority(identity);
    // There is no transparent balance: the only positive-value source belongs
    // to t1@, while its zero-value definition is evidence, never a fee input.
    expect(source.outs.some(output => output.script.equals(transparentFundingScript))).toBe(false);
  }
  let otherSource, otherAuthority;
  let substituteFunding = wrongSourceStage === 'commitment';
  if (wrongSourceStage) {
    // This identity is spendable with the same key, but was not selected to pay.
    const otherId = IdentityID.fromAddress(nameAndParentAddrToIAddr('other', system));
    otherAuthority = registerAuthority(new Identity({
      version: new BN(3), flags: new BN(0), minSigs: new BN(1),
      primaryAddresses: [KeyID.fromAddress(address)], name: 'other',
      parent: IdentityID.fromAddress(system), systemId: IdentityID.fromAddress(system),
      revocationAuthority: otherId, recoveryAuthority: otherId, unlockAfter: new BN(0),
    }));
    const params = new OptCCParams({...nativeParams(), destinations: [new TxDestination(otherId)]});
    otherSource = Transaction.fromHex(source.toHex(), networks.verus);
    otherSource.ins[0].hash = Buffer.alloc(32, 10);
    otherSource.outs = [{value: 200000000, script: new SmartTransactionScript(params, params).toBuffer()}];
    transactions.set(otherSource.getId(), {transaction: otherSource, height: 10});
  }
  const spent = new Set();
  let liveSourceSpent = false;
  let spendAuthorityDuringPreparation = false;
  let authorityChecks = 0;
  const mine = txid => {
    tip += 1;
    transactions.get(txid).height = tip;
  };
  const rpcCalls = [];
  const rpcReads = [];
  const batchCalls = [];
  let activeSingleTxOuts = 0;
  let peakSingleTxOuts = 0;
  let broadcastCount = 0;

  const respond = async rpcRequest => {
    rpcCalls.push(rpcRequest.method);
    rpcReads.push(rpcRequest);
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
        if (otherAuthority && first === otherAuthority.identity.identityaddress) return ok(otherAuthority);
        return {id: rpcRequest.id, result: null, error: {code: -5, message: 'Identity not found'}};
      case 'getaddressutxos':
        expect(first.addresses).toEqual([fundingAddress]);
        return ok([...transactions].filter(([txid]) => substituteFunding
          ? txid === otherSource.getId() : txid !== otherSource?.getId()).flatMap(([txid, entry]) => entry.transaction.outs
          .map((output, outputIndex) => ({output, outputIndex, currencyvalues: fundingCurrencies(output)}))
          .filter(({currencyvalues, outputIndex}) => (substituteFunding || currencyvalues !== null) && !spent.has(`${txid}:${outputIndex}`))
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
        const checkingAuthority = spendAuthorityDuringPreparation &&
          first === fundingAuthority?.txid && second === fundingAuthority.vout;
        if (checkingAuthority) authorityChecks++;
        if (!output || spent.has(`${first}:${second}`) ||
          (liveSourceSpent && first === source.getId() && second === 0)) return ok(null);
        const atomic = String(output.value).padStart(9, '0');

        // Model an identity update entering the mempool after the first proof.
        // The tip and funding outputs remain unchanged; only a fresh authority
        // outpoint check can reject the cached identity before signing.
        if (checkingAuthority) spent.add(`${first}:${second}`);
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
        const persisted = mockReadJob([...mockEncryptedJobs.keys()][0]);
        const stage = persisted.registration?.signedHex === first ? 'registration' : 'commitment';
        expect(persisted[stage].signedHex).toBe(first);
        expect(persisted[stage].txid).toBe(transaction.getId());
        expect(mockClient.validateIdentityRegistrationTransaction(persisted[stage].prepared, first))
          .toMatchObject({valid: true, signingStatus: 'complete', txid: transaction.getId()});
        transactions.set(transaction.getId(), {transaction, height: 0});
        transaction.ins.forEach(input => spent.add(`${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`));
        if (broadcastCount === 1 && broadcastFailure) {
          if (broadcastFailure === 'timeout') throw new Error('Response lost after submission');
          if (broadcastFailure === 'rpc-error') return {error: {code: -25, message: 'RPC rejected transaction'}};
          if (broadcastFailure === 'missing-response') return undefined;
          return ok('d'.repeat(64));
        }
        return ok(transaction.getId());
      }
      default:
        throw new Error(`Unexpected offline RPC: ${rpcRequest.method}`);
    }
  };

  // Exercise the installed SDK's request serialization and Mobile's actual
  // batching/fallback transport. Each fallback server has its own capability
  // marker, so rejecting arrays cannot disable batching in another scenario.
  const endpoint = `https://offline-${identityFunding ? 'identity' : 'address'}-${batchUnsupported ? 'fallback' : 'batch'}.invalid`;
  mockClient = new VerusIdInterface(system, endpoint, undefined, async request => {
    if (request.method !== 'gettxout') return respond(request);

    activeSingleTxOuts++;
    peakSingleTxOuts = Math.max(peakSingleTxOuts, activeSingleTxOuts);
    try {
      await new Promise(resolve => setImmediate(resolve));
      return await respond(request);
    } finally {
      activeSingleTxOuts--;
    }
  });
  mockClient.interface.rpcBatchRequestOverride = async requests => {
    batchCalls.push(requests);
    expect(requests.length).toBeLessThanOrEqual(20);
    expect(requests.every(request => request.method !== 'sendrawtransaction')).toBe(true);

    if (batchUnsupported) {
      return {result: null, error: {code: -32600, message: 'Batching is disabled'}};
    }

    return Promise.all(requests.map(respond));
  };
  const batcher = new VrpcRequestBatcher(endpoint, requests => mockClient.interface.request(requests), 500);
  mockClient.interface.requestMany = requests => batcher.requestMany(requests);
  const commitmentBuilder = jest.spyOn(mockClient, 'createNameReservationTransaction');

  const context = createRegistrationContext();
  const assertAuthorityChangeBlocksApproval = async (stage, paymentReview) => {
    const encryptedBefore = mockEncryptedJobs.get(paymentReview.jobId);
    const broadcastsBefore = broadcastCount;
    const tipBefore = tip;
    const readStart = rpcReads.length;
    const batchStart = batchCalls.length;
    const signing = jest.spyOn(mockClient, 'signIdentityRegistrationTransaction');
    const approve = stage === 'commitment' ? approveCommitment : approveRegistration;
    spendAuthorityDuringPreparation = true;

    await expect(approve(paymentReview.jobId, paymentReview.approvalToken, context))
      .rejects.toMatchObject({code: 'AUTHORITY_CHANGED'});
    expect(authorityChecks).toBe(2);
    expect(tip).toBe(tipBefore);
    expect(signing).not.toHaveBeenCalled();
    expect(broadcastCount).toBe(broadcastsBefore);
    expect(mockEncryptedJobs.get(paymentReview.jobId)).toBe(encryptedBefore);
    expect(mockReadJob(paymentReview.jobId)[stage].signedHex).toBeUndefined();

    // Canonical identity bytes are still reused; the final snapshot batch adds
    // only a live spendability check for its defining output.
    expect(rpcReads.slice(readStart).filter(request => request.method === 'getrawtransaction' &&
      request.params[0] === fundingAuthority.txid)).toHaveLength(1);
    if (!batchUnsupported) {
      expect(batchCalls.slice(batchStart).some(requests =>
        requests.some(request => request.method === 'getinfo') &&
        requests.some(request => request.method === 'getblock') &&
        requests.some(request => request.method === 'gettxout' && request.params[0] === fundingAuthority.txid)
      )).toBe(true);
    }
  };
  const assertGuardBlocksCorruptedSignature = async (stage, paymentReview) => {
    const originalSign = mockClient.signIdentityRegistrationTransaction.bind(mockClient);
    const broadcastBefore = broadcastCount;
    let corruptReceipt;
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
      corruptReceipt = {prepared: args.transaction, signedHex: changed.toHex(), txid: changed.getId()};
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
    expect(mockReadJob(paymentReview.jobId)[stage].signedHex).toBeUndefined();
    // The first attempt rejects before persistence. Corrupt the actual compact
    // bytes independently to ensure retries still verify all approved spending.
    const record = mockReadRecord(paymentReview.jobId);
    const receipt = record[stage];
    const plan = record.pools.plans[receipt.plan];
    record.pools.transactions[plan.transaction] = Buffer.from(corruptReceipt.prepared.txHex, 'hex').toString('base64');
    receipt.signedHex = record.pools.transactions.push(Buffer.from(corruptReceipt.signedHex, 'hex').toString('base64')) - 1;
    delete receipt.values.txid;
    if (guardAttack === 'redirected-change') plan.data.changeAddress = corruptReceipt.prepared.changeAddress;
    record.values.status = `${stage}_signed`;
    await mockWriteRecord(paymentReview.jobId, record);
    await expect(retryBroadcast(paymentReview.jobId, context))
      .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(broadcastCount).toBe(broadcastBefore);
  };
  const request = {
    systemId: system, chainTicker: 'VRSC', rootSystemName: 'VRSC',
    fundingAddress, signingAddress: address,
    keyChannel: 'vrpc', name: tokenProof == null ? 'Alice' : 'Alice.community@',
    ...(privateAddress ? {privateAddress} : {}),
  };
  if (authorityStatus && authorityStatus !== 'elapsed-countdown') {
    await expect((async () => {
      const resolved = await resolveRegistration(request, context);
      return prepareCommitment({request, approvedCosts: resolved.quote.totalOperationRequired}, context);
    })()).rejects.toMatchObject({code: ['locked', 'countdown'].includes(authorityStatus) ? 'LOCKED_AUTHORITY' : 'FUNDING_AUTHORIZATION_REQUIRED'});
    expect(mockEncryptedJobs.size).toBe(0);
    expect(broadcastCount).toBe(0);
    return;
  }
  const resolved = await resolveRegistration(request, context);
  // Snapshot and namespace policy share definitions within this resolution,
  // while the ending snapshot assertion still performs a fresh chain read.
  expect(rpcCalls.filter(method => method === 'getcurrency')).toHaveLength(tokenProof == null ? 1 : 2);
  expect(rpcCalls.filter(method => method === 'getinfo')).toHaveLength(2);
  const registrationCosts = tokenProof == null
    ? {[system]: '100000000'}
    : {[system]: tokenProof === 1 ? '1020000' : '1000000', [token]: '100000000'};
  expect(resolved.quote.branch).toBe(branch);
  expect(resolved.quote.totalOperationRequired).toEqual({
    ...registrationCosts, [system]: new BN(registrationCosts[system]).addn(10000).toString(10),
  });
  if (wrongSourceStage === 'commitment') {
    await expect(prepareCommitment({request}, context)).rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(mockEncryptedJobs.size).toBe(0);
    expect(broadcastCount).toBe(0);
    return;
  }
  const preparationReadStart = rpcReads.length;
  const review = await prepareCommitment({request, ...(reserveCurrencyCount ? {} : {
    approvedCosts: resolved.quote.totalOperationRequired,
  })}, context);
  const commitmentFee = reserveCurrencyCount ? '20000' : '10000';
  expect(review.quote.commitmentFee).toBe(commitmentFee);
  // The funding preflight and coin selection reuse immutable source bytes.
  // Spendability checks remain separate reads, including later approval.
  expect(rpcReads.slice(preparationReadStart).filter(request =>
    request.method === 'getrawtransaction' && request.params[0] === source.getId() && !request.params[1]
  )).toHaveLength(reserveCurrencyCount ? 2 : 1);
  if (!batchUnsupported) {
    const groupedMethods = batchCalls.map(requests => requests.map(request => request.method));
    expect(groupedMethods).toContainEqual(['getinfo', 'getcurrency']);
    expect(groupedMethods).toContainEqual(['getinfo', 'getblock']);
    expect(groupedMethods.some(methods => methods.includes('getrawtransaction') && methods.includes('gettxout'))).toBe(true);
  }
  expect(broadcastCount).toBe(0);
  const encrypted = mockEncryptedJobs.get(review.jobId);
  const persisted = mockReadJob(review.jobId);
  assertCompactPlans(review.jobId);
  expect(review.identity.parent).toBe(tokenProof == null ? system : token);
  expect(persisted.reservation.parentID).toBe(tokenProof == null ? system : token);
  expect(persisted.identity.privateaddress).toBe(privateAddress);
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

  if (historicalReceipt) {
    // Recreate the pre-upgrade SDK's 10,000-unit commitment with real source
    // transactions and signatures. Only this historical fixture uses its raw
    // signer; the public SDK must continue rejecting that fee for new sends.
    const prepared = persisted.commitment.prepared;
    const transaction = Transaction.fromHex(prepared.txHex, networks.verus);
    const changeIndex = prepared.outputPlan.findIndex(output => output.role === 'change');
    transaction.outs[changeIndex].value += 10000;
    prepared.txHex = prepared.hex = transaction.toHex();
    prepared.outputPlan[changeIndex].value = String(transaction.outs[changeIndex].value);
    prepared.outputPlan[changeIndex].values[system] = prepared.outputPlan[changeIndex].value;
    prepared.nativeFee = prepared.quote.commitmentFee = '10000';
    prepared.quote.totalOperationRequired[system] = '100010000';
    const {signIdentityRegistrationTransaction} = require('verusid-ts-client/lib/identity/registrationSigning');
    const signed = signIdentityRegistrationTransaction({
      txHex: prepared.txHex, prevouts: prepared.prevouts,
      identityAuthorities: prepared.identityAuthorities, keys: prepared.prevouts.map(() => [mockWif]),
    });
    expect(signed.signingStatus).toBe('complete');
    expect(() => mockClient.validateIdentityRegistrationTransaction(prepared, signed.hex))
      .toThrow(expect.objectContaining({code: 'INSUFFICIENT_RELAY_FEE'}));
    persisted.commitment = {...persisted.commitment, signedHex: signed.hex, txid: signed.txid};
    persisted.status = 'commitment_signed';

    if (historicalReceipt === 'signature' || historicalReceipt === 'intent') {
      const changed = Transaction.fromHex(signed.hex, networks.verus);
      if (historicalReceipt === 'signature') changed.ins[0].script[20] ^= 1;
      else changed.outs[changeIndex].value -= 1;
      persisted.commitment.signedHex = changed.toHex();
      persisted.commitment.txid = changed.getId();
    } else if (historicalReceipt === 'change-address') {
      persisted.fundingAddress = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 8), networks.verus).getAddress();
    } else if (historicalReceipt === 'confirmed') {
      transactions.set(signed.txid, {transaction: Transaction.fromHex(signed.hex, networks.verus), height: 0});
      mine(signed.txid);
      spent.add(`${source.getId()}:0`);
    } else if (historicalReceipt === 'expired') {
      tip = prepared.snapshot.expiryHeight;
    }
    const receipt = await mockWriteJob(persisted);

    if (historicalReceipt === 'confirmed') {
      expect(await reconcileRegistration(review.jobId, context)).toMatchObject({status: 'commitment_confirmed'});
      expect(await prepareRegistration({jobId: review.jobId}, context)).toMatchObject({
        status: 'registration_prepared', quote: {commitmentFee: '10000'},
      });
    } else if (historicalReceipt === 'expired') {
      expect(await reconcileRegistration(review.jobId, context)).toMatchObject({status: 'commitment_expired'});
      expect(await refreshRegistrationReview(review.jobId, context)).toMatchObject({
        status: 'commitment_prepared', quote: {commitmentFee: '20000'},
      });
      const rebuilt = mockReadJob(review.jobId);
      expect(rebuilt.saltHex).toBe(persisted.saltHex);
      expect(rebuilt.previousCommitments[0].signedHex).toBe(signed.hex);
    } else if (historicalReceipt === 'unsent') {
      await expect(retryBroadcast(review.jobId, context)).rejects.toMatchObject({code: 'INSUFFICIENT_RELAY_FEE'});
      const retained = mockReadJob(review.jobId);
      expect(retained.status).toBe('commitment_signed');
      expect(JSON.stringify(retained.commitment) === JSON.stringify(persisted.commitment)).toBe(true);
      expect(retained.saltHex).toBe(persisted.saltHex);
    } else {
      const result = expect(reconcileRegistration(review.jobId, context)).rejects;
      if (historicalReceipt === 'change-address') await result.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
      else if (historicalReceipt === 'intent') await result.toMatchObject({code: 'TRANSACTION_CHANGED'});
      else await result.toThrow();
      expect(mockEncryptedJobs.get(review.jobId) === receipt).toBe(true);
    }
    expect(broadcastCount).toBe(0);
    return;
  }

  if (wrongSourceStage === 'approval') {
    substituteFunding = true;
    const signing = jest.spyOn(mockClient, 'signIdentityRegistrationTransaction');
    await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(signing).not.toHaveBeenCalled();
    expect(mockEncryptedJobs.get(review.jobId)).toBe(encrypted);
    expect(broadcastCount).toBe(0);
    return;
  }

  if (wrongSourceStage === 'saved') {
    // Model an existing signed receipt without bypassing the SDK's signature,
    // value or raw-transaction checks. Only Mobile knows the selected source.
    const built = await mockClient.createNameReservationTransaction({
      ...commitmentBuilder.mock.calls[0][0], funding: [{txid: otherSource.getId(), vout: 0}],
    });
    const signed = mockClient.signIdentityRegistrationTransaction({transaction: built.transaction, keys: [[mockWif]]});
    expect(signed.signingStatus).toBe('complete');
    persisted.commitment = {prepared: built.transaction, vout: built.commitmentVout, signedHex: signed.hex, txid: signed.txid};
    persisted.status = 'commitment_signed';
    const receipt = await mockWriteJob(persisted);
    await expect(retryBroadcast(review.jobId, context)).rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(mockEncryptedJobs.get(review.jobId)).toBe(receipt);
    expect(broadcastCount).toBe(0);
    return;
  }

  if (sourceFailure) {
    if (sourceFailure === 'tampered') {
      const changedSource = Transaction.fromHex(source.toHex(), networks.verus);
      changedSource.outs[0].value += 1;
      const record = mockReadRecord(review.jobId);
      const plan = record.pools.plans[record.commitment.plan];
      record.pools.transactions[plan.prevouts[0].transaction] = Buffer.from(changedSource.toHex(), 'hex').toString('base64');
      await mockWriteRecord(review.jobId, record);
    } else {
      // Address discovery can race a spend. Keep its response unchanged so the
      // refreshed builder must detect unavailability through live gettxout.
      liveSourceSpent = true;
    }
    const encryptedBeforeApproval = mockEncryptedJobs.get(review.jobId);
    const signing = jest.spyOn(mockClient, 'signIdentityRegistrationTransaction');
    rpcCalls.length = 0;
    const approval = expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects;
    if (sourceFailure === 'tampered') await approval.toThrow();
    else await approval.toMatchObject({code: 'FUNDING_SPENT'});
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

  if (authoritySpendStage === 'commitment') {
    await assertAuthorityChangeBlocksApproval('commitment', review);
    return;
  }

  const submitted = await approveCommitment(review.jobId, review.approvalToken, context);

  expect(submitted.status).toBe('commitment_broadcast');
  expect(broadcastCount).toBe(1);
  const saved = mockReadJob(review.jobId);
  if (broadcastFailure) {
    expect(saved.commitment.broadcastStatus).toBe('unknown');
    await retryBroadcast(review.jobId, context);
    expect(broadcastCount).toBe(1);
    expect(mockReadJob(review.jobId).commitment.signedHex)
      .toBe(saved.commitment.signedHex);
  }
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
  if (wrongSourceStage === 'registration') {
    substituteFunding = true;
    const before = mockEncryptedJobs.get(review.jobId);
    await expect(prepareRegistration({jobId: review.jobId}, context)).rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(mockEncryptedJobs.get(review.jobId)).toBe(before);
    expect(broadcastCount).toBe(1);
    return;
  }
  const registrationReview = await prepareRegistration({jobId: review.jobId}, context);
  expect(registrationReview.status).toBe('registration_prepared');
  expect(registrationReview.quote.totalRequired).toEqual(registrationCosts);
  expect(registrationReview.quote.commitmentFee).toBe(commitmentFee);
  expect(registrationReview.quote.totalOperationRequired[system])
    .toBe(new BN(registrationCosts[system]).add(new BN(commitmentFee)).toString(10));
  expect(broadcastCount).toBe(1);
  const preparedReveal = mockReadJob(review.jobId);
  assertCompactPlans(review.jobId);
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
    ...(privateAddress ? {privateaddress: privateAddress} : {}),
  });
  expect((revealIdentity.privateAddresses || []).map(destination => destination.toAddressString()))
    .toEqual(privateAddress ? [privateAddress] : []);
  expect(preparedReveal.registration.prepared.prevouts).toHaveLength(tokenProof == null ? 2 : 3);
  expect(preparedReveal.registration.prepared.prevouts[0]).toMatchObject({
    txid: saved.commitment.txid, vout: saved.commitment.vout, value: '0',
    rawTransaction: saved.commitment.signedHex,
  });
  expect(preparedReveal.registration.prepared.prevouts[tokenProof == null ? 1 : 2]).toMatchObject({
    txid: saved.commitment.txid, value: new BN(200000000).sub(new BN(commitmentFee)).toString(10),
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

  if (authoritySpendStage === 'registration') {
    await assertAuthorityChangeBlocksApproval('registration', registrationReview);
    return;
  }

  const registered = await approveRegistration(review.jobId, registrationReview.approvalToken, context);
  expect(registered.status).toBe('registration_broadcast');
  expect(broadcastCount).toBe(2);
  expect(linkVerusId).not.toHaveBeenCalled();
  const signedReveal = mockReadJob(review.jobId);
  expect(signedReveal.reservation.reservationHex).toBe(persisted.reservation.reservationHex);
  expect(mockClient.validateIdentityRegistrationTransaction(signedReveal.registration.prepared, signedReveal.registration.signedHex))
    .toMatchObject({valid: true, signingStatus: 'complete', txid: signedReveal.registration.txid});
  expect(spent.has(`${saved.commitment.txid}:${saved.commitment.vout}`)).toBe(true);

  mine(signedReveal.registration.txid);
  const completed = await reconcileRegistration(review.jobId, context);
  expect(completed).toMatchObject({status: 'registered', linked: false});
  expect(linkVerusId).not.toHaveBeenCalled();
  expect(publishRegistrationState).not.toHaveBeenCalled();
  if (deleteCompleted) {
    // A confirmed identity awaiting linking remains available for manual removal.
    const record = mockReadRecord(review.jobId);
    // Deliberately make historical approval metadata incompatible with the
    // current verifier, while retaining the exact confirmed signed bytes.
    delete record.pools.plans[record.registration.plan].commitment;
    await mockWriteRecord(review.jobId, record);
    const receipt = mockReadJob(review.jobId);
    expect(() => mockClient.validateIdentityRegistrationTransaction(
      receipt.registration.prepared, receipt.registration.signedHex, receipt.fundingAddress,
    )).toThrow(expect.objectContaining({code: 'REGISTRATION_FUNDING_MISMATCH'}));
    await expect(reconcileRegistration(review.jobId, context))
      .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
    expect(await deleteRegistration(review.jobId, 'completed', context)).toEqual({jobId: review.jobId});
    expect(linkVerusId).not.toHaveBeenCalled();
  } else {
    expect(await linkRegisteredIdentity(review.jobId, context)).toMatchObject({status: 'complete', linked: true});
    expect(linkVerusId).toHaveBeenCalledTimes(1);
    expect(linkVerusId).toHaveBeenCalledWith(review.identityAddress, signedReveal.reservation.fullName, 'VRSC', context);
    expect(publishRegistrationState).toHaveBeenCalledWith(context);
  }
  expect(mockEncryptedJobs.has(review.jobId)).toBe(false);
  expect(broadcastCount).toBe(2);
  expect(rpcCalls).not.toContain('registernamecommitment');
  expect(rpcCalls).not.toContain('registeridentity');
  if (batchUnsupported) {
    expect(batchCalls).toHaveLength(1);
    expect(peakSingleTxOuts).toBe(1);
  } else {
    // Submission binds every input to the active block in the same read group.
    expect(batchCalls.some(requests => requests.length >= 2 &&
      requests[0].method === 'getblock' &&
      requests.slice(1).every(request => request.method === 'gettxout'))).toBe(true);
  }
}, 10000);
