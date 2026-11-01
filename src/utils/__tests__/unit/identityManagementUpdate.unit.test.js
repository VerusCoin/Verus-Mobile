// Real SDK funding verification/signing, transaction serialization, and identity
// primitives; only device account/authentication and RPC I/O are replaced.
let mockClient;
let mockState;
let mockTransactions;
let mockIdentities;
let mockFunding;
let mockTip;
let mockFee;
let mockWrongChain;
let mockSubjectFunding;
let mockPending;
let mockFundingCounter;
const mockReadStorage = jest.fn();
const mockPersist = jest.fn();
const mockBuild = jest.fn();
const mockSign = jest.fn();
const mockGetKey = jest.fn();
const mockGetIdentity = jest.fn();
const mockGetUpdatable = jest.fn();
const mockGetUtxos = jest.fn();
const mockSend = jest.fn();
const mockGetTxOut = jest.fn();
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: (...args) => mockGetKey(...args),
  requestServiceStoredData: (...args) => mockReadStorage(...args)}));
jest.mock('../../../actions/actions/services/dispatchers/services', () => ({
  modifyServiceStoredDataForUser: (...args) => mockPersist(...args),
}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {
  getEndpoint: () => mockClient.interface, getVerusIdInterface: () => mockClient,
}}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: (...args) => mockGetIdentity(...args)}));
jest.mock('../../api/channels/vrpc/requests/getAddressUtxos', () => ({getSpendableUtxos: (...args) => mockGetUtxos(...args)}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  getUpdatableIdentity: (...args) => mockGetUpdatable(...args),
  createUpdateIdentityTxWithUtxos: (...args) => mockBuild(...args),
  createUpdateIdentityWithCurrencyTransferTx: (...args) => mockBuild(...args),
  signUpdateIdentityTx: (...args) => mockSign(...args),
}));

const {ECPair, Transaction, TransactionBuilder, networks, script} = require('@bitgo/utxo-lib');
const {VerusIdInterface} = require('verusid-ts-client');
const {Identity, IdentityScript, IdentityID, SmartTransactionScript, OptCCParams, TxDestination,
  TransferDestination, DEST_ID, DEST_PKH, fromBase58Check,
  BigNumber: BN, EVALS, nameAndParentAddrToIAddr} = require('verus-typescript-primitives');
const {unpackOutput} = require('@bitgo/utxo-lib/dist/src/smart_transactions');
const {captureIdentityUpdateContext, loadIdentityForUpdate, prepareIdentityUpdate, sendIdentityUpdate} = require('../../identityManagement/updateIdentity');
const SYSTEM = nameAndParentAddrToIAddr('VRSCTEST');
const SUBJECT = nameAndParentAddrToIAddr('alice', SYSTEM);
const RECIPIENT = nameAndParentAddrToIAddr('satoshi', SYSTEM);
const FUNDING_ID = nameAndParentAddrToIAddr('funds', SYSTEM);
const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 11), networks.verus);
const address = key.getAddress();
const otherKey = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 12), networks.verus);
const otherAddress = otherKey.getAddress();
const thirdAddress = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 13), networks.verus).getAddress();
const coin = {id: 'VRSCTEST', display_ticker: 'VRSCTEST', system_id: SYSTEM, currency_id: SYSTEM, testnet: true};
const PRIVATE = 'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa';
const OTHER_PRIVATE = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
const ok = result => ({result, error: null});
const missing = () => ({result: null, error: {code: -5, message: 'Not found'}});
const builder = () => {
  const txb = new TransactionBuilder(networks.verus);
  txb.setVersion(4);
  txb.setVersionGroupId(0x892f2085);
  txb.setExpiryHeight(mockTip + 20);
  return txb;
};
const transparentScript = destination => script.pubKeyHash.output.encode(require('verus-typescript-primitives').fromBase58Check(destination).hash);
const idFundingScript = destination => {
  const condition = () => new OptCCParams({version: new BN(3), evalCode: new BN(EVALS.EVAL_NONE),
    m: new BN(1), n: new BN(1), destinations: [new TxDestination(IdentityID.fromAddress(destination))], vData: []});
  return new SmartTransactionScript(condition(), condition()).toBuffer();
};
const putIdentity = (name, changes = {}) => {
  const id = nameAndParentAddrToIAddr(name, SYSTEM);
  const identity = Identity.fromJson({version: 3, flags: 0, name, parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: [address], minimumsignatures: 1, recoveryauthority: id, revocationauthority: id,
    timelock: 0, ...changes});
  const txb = builder();
  txb.addInput(Buffer.alloc(32, 33), 0);
  txb.addOutput(IdentityScript.fromIdentity(identity).toBuffer(), 0);
  const transaction = txb.buildIncomplete();
  mockTransactions.set(transaction.getId(), transaction);
  const result = {identity: identity.toJson(), txid: transaction.getId(), vout: 0,
    blockheight: 20, fullyqualifiedname: `${name}.VRSCTEST@`, status: identity.isRevoked() ? 'revoked' : 'active'};
  mockIdentities.set(id, result);
  mockIdentities.set(`${name}@`, result);
  return result;
};
const putFunding = (destination = address, currencies) => {
  let transaction;
  if (currencies) {
    transaction = Transaction.fromHex(VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM, [{currencies,
      address: new TransferDestination({type: destination === address ? DEST_PKH : DEST_ID,
        destinationBytes: fromBase58Check(destination).hash})}], mockTip + 20), networks.verus);
    transaction.addInput(Buffer.alloc(32, 44), 0);
  } else {
    const txb = builder();
    txb.addInput(Buffer.alloc(32, 44), 0);
    txb.addOutput(destination === address ? transparentScript(address) : idFundingScript(destination), 100000000);
    transaction = txb.buildIncomplete();
  }
  mockTransactions.set(transaction.getId(), transaction);
  mockFunding = {address: destination, txid: transaction.getId(), outputIndex: 0, script: transaction.outs[0].script.toString('hex'),
    satoshis: transaction.outs[0].value, height: 10, isspendable: true, blocktime: 100};
  return mockFunding;
};
const putSubjectFunds = (currencies = {[SYSTEM]: '100000000'}, options = {}) => {
  const tx = Transaction.fromHex(VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM, [{currencies,
    address: new TransferDestination({type: DEST_ID, destinationBytes: fromBase58Check(SUBJECT).hash})}], mockTip + 20), networks.verus);
  tx.addInput(Buffer.alloc(32, ++mockFundingCounter), 0);
  mockTransactions.set(tx.getId(), tx);
  const entry = {address: SUBJECT, txid: tx.getId(), outputIndex: 0, satoshis: tx.outs[0].value,
    script: tx.outs[0].script.toString('hex'), height: 10, isspendable: true, blocktime: 100, ...options};
  mockSubjectFunding.push(entry);
  return entry;
};
const load = context => loadIdentityForUpdate({chain: coin, identityAddress: SUBJECT}, context);
const prepare = async (options = {mode: 'transfer', recipient: otherAddress}, context = captureIdentityUpdateContext()) =>
  prepareIdentityUpdate(await load(context), options, context);
const outputAmountsAt = (transaction, destination) => {
  const amounts = {};
  for (const output of transaction.outs) {
    const decoded = unpackOutput(output, SYSTEM, false, true);
    if (!decoded.destinations.includes(destination)) continue;
    for (const [currency, value] of Object.entries(decoded.values)) {
      amounts[currency] = ((BigInt(amounts[currency] || 0)) + BigInt(value.toString())).toString();
    }
  }
  return amounts;
};

beforeEach(() => {
  jest.resetAllMocks();
  mockReadStorage.mockRejectedValue(new Error('Transaction storage must not be read'));
  mockPersist.mockRejectedValue(new Error('Transaction storage must not be written'));
  mockTip = 100;
  mockFee = 10000;
  mockWrongChain = false;
  mockSubjectFunding = [];
  mockPending = [];
  mockFundingCounter = 50;
  mockTransactions = new Map();
  mockIdentities = new Map();
  mockState = {authentication: {activeAccount: {accountHash: 'alice-account', keys: {VRSCTEST: {vrpc: {addresses: [address]}}}}, sessionEpoch: 1},
    coins: {activeCoinsForUser: [coin]}, channelStore_verusid: {watchedVerusIds: {VRSCTEST: {[SUBJECT]: 'alice.VRSCTEST@', [FUNDING_ID]: 'funds.VRSCTEST@'}}}};
  putIdentity('alice');
  putIdentity('satoshi', {primaryaddresses: [otherAddress]});
  putIdentity('funds');
  putFunding();
  mockGetKey.mockResolvedValue(key.toWIF());
  mockGetIdentity.mockImplementation(async (_system, identifier) => mockIdentities.has(identifier) ? ok(mockIdentities.get(identifier)) : missing());
  mockGetUpdatable.mockImplementation(async (_system, result) => {
    const transaction = mockTransactions.get(result.txid);
    const parsed = new IdentityScript();
    parsed.fromBuffer(transaction.outs[result.vout].script);
    return {tx: transaction.toHex(), identity: parsed.getIdentity()};
  });
  mockGetUtxos.mockImplementation(async (_system, _currency, addresses) => addresses.includes(mockFunding.address) ? [{...mockFunding}] : []);
  mockGetTxOut.mockImplementation(async (txid, vout) => {
    const out = mockTransactions.get(txid)?.outs[vout];
    return ok(out ? {value: out.value / 1e8, scriptPubKey: {hex: out.script.toString('hex')}} : null);
  });
  mockSend.mockImplementation(async hex => {
    const tx = Transaction.fromHex(hex, networks.verus);
    mockTransactions.set(tx.getId(), tx);
    return ok(tx.getId());
  });
  mockClient = new VerusIdInterface(SYSTEM, 'https://offline.invalid', undefined, async request => {
    const [first, second, third] = request.params || [];
    switch (request.method) {
      case 'getinfo': return ok({blocks: mockTip, longestchain: mockTip + 500, chainid: mockWrongChain ? RECIPIENT : SYSTEM});
      case 'getcurrency': return ok({currencyid: SYSTEM});
      case 'getidentity': return mockGetIdentity(SYSTEM, first);
      case 'getaddressutxos': return ok(first.addresses.includes(SUBJECT) ? mockSubjectFunding.map(input => ({...input})) : []);
      case 'getaddressmempool': return ok(mockPending);
      case 'getrawtransaction': return mockTransactions.has(first) ? ok(mockTransactions.get(first).toHex()) : missing();
      case 'gettxout': return mockGetTxOut(first, second);
      case 'sendrawtransaction': return mockSend(first);
      case 'fundrawtransaction': {
        const tx = Transaction.fromHex(first, networks.verus);
        for (const candidate of second) {
          if (!tx.ins.some(input => Buffer.from(input.hash).reverse().toString('hex') === candidate.txid && input.index === candidate.voutnum)) {
            tx.addInput(Buffer.from(candidate.txid, 'hex').reverse(), candidate.voutnum);
          }
        }
        const balances = new Map();
        const add = (out, sign, allowMetadata = false) => {
          const values = unpackOutput(out, SYSTEM, !allowMetadata, allowMetadata).values;
          for (const [id, value] of Object.entries(values)) balances.set(id, (balances.get(id) || 0n) + BigInt(value.toString()) * sign);
        };
        for (const input of tx.ins) add(mockTransactions.get(Buffer.from(input.hash).reverse().toString('hex')).outs[input.index], 1n);
        for (const output of tx.outs) add(output, -1n, true);
        balances.set(SYSTEM, (balances.get(SYSTEM) || 0n) - BigInt(mockFee));
        if ([...balances.values()].some(value => value < 0n)) throw new Error('Insufficient funds');
        const change = Transaction.fromHex(VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM,
          [{currencies: Object.fromEntries([...balances].map(([id, value]) => [id, value.toString()])),
            address: new TransferDestination({type: third === address ? DEST_PKH : DEST_ID, destinationBytes: fromBase58Check(third).hash})}], mockTip + 20), networks.verus);
        tx.outs.push(...change.outs);
        return ok({hex: tx.toHex(), fee: mockFee / 1e8, changepos: 1});
      }
      default: throw new Error(`Unexpected RPC ${request.method}`);
    }
  });
  mockBuild.mockImplementation(args => args.currencyTransferOutputs
    ? mockClient.createUpdateIdentityWithCurrencyTransferTransaction(args.identity, args.changeAaddr, args.rawIdTx,
      args.idHeight, args.currencyTransferOutputs, args.utxos, {chainIAddr: args.systemId, maxFee: args.maxFee,
        fundRawTransactionResult: args.fundRawTransactionResult, currentHeight: args.currentHeight,
        expectedIdentityPrimaryAddresses: args.expectedIdentityPrimaryAddresses,
        expectedIdentityMinimumSignatures: args.expectedIdentityMinimumSignatures, isTestnet: args.isTestnet})
    : mockClient.createUpdateIdentityTransaction(args.identity, args.changeAaddr, args.rawIdTx,
      args.idHeight, args.utxos, args.systemId, args.maxFee, args.fundRawTransactionResult, args.currentHeight, undefined, true, args.isTestnet));
  mockSign.mockImplementation((_system, hex, inputs, keys, approval, lockContext) => mockClient.signUpdateIdentityTransaction(hex, inputs, keys, approval, lockContext));
});

test('loads raw identity controls and prepares/signs a reviewed transfer using the real SDK', async () => {
  const context = captureIdentityUpdateContext();
  const model = await load(context);
  expect(model).toMatchObject({displayName: 'alice.VRSCTEST@', identityAddress: SUBJECT, fundingAddress: address, locked: false});
  const plan = await prepareIdentityUpdate(model, {mode: 'transfer', recipient: otherAddress}, context);
  expect(plan.review).toMatchObject({fee: '0.0001', feeCurrency: 'VRSCTEST', losesControl: true,
    before: {primaryaddresses: [address]}, after: {primaryaddresses: [otherAddress], minimumsignatures: 1}});
  expect(Object.keys(plan)).toEqual(['review']);
  expect(mockGetKey).not.toHaveBeenCalled();
  const result = await sendIdentityUpdate(plan, context);
  expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockGetKey).toHaveBeenCalledWith('VRSCTEST', 'vrpc', context);
  expect(mockSend).toHaveBeenCalledTimes(1);
  await expect(sendIdentityUpdate(plan, context)).resolves.toEqual(result);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('submits the reviewed signed bytes without reading or writing transaction storage', async () => {
  const plan = await prepare();
  const result = await sendIdentityUpdate(plan);
  expect(result.txid).toBe(Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId());
  expect(mockSend.mock.calls[0][0]).toBe(mockSign.mock.results[0].value);
  expect(mockSign.mock.calls[0][4]).toMatchObject({systemId: SYSTEM, identity: {identityAddress: SUBJECT}});
  expect(mockReadStorage).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
});

test('a cancelled authorization leaves an unsubmitted review available for approval', async () => {
  const plan = await prepare();
  mockGetKey.mockRejectedValueOnce(new Error('Authorization cancelled'));
  const error = await sendIdentityUpdate(plan).catch(value => value);
  expect(error.message).toBe('Authorization cancelled');
  expect(error).not.toHaveProperty('submitted');
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test.each([0, 99, 100])('checks raw coinbase maturity at %i confirmations even when RPC omits its coinbase flag', async confirmations => {
  const source = mockTransactions.get(mockFunding.txid).clone();
  source.ins[0].hash = Buffer.alloc(32);
  source.ins[0].index = 0xffffffff;
  mockTransactions.set(source.getId(), source);
  mockFunding = {...mockFunding, txid: source.getId()};
  mockGetTxOut.mockImplementation(async (txid, vout) => {
    const output = mockTransactions.get(txid)?.outs[vout];
    return ok(output ? {value: output.value / 1e8, scriptPubKey: {hex: output.script.toString('hex')},
      confirmations: txid === source.getId() ? confirmations : 1000} : null);
  });
  const plan = await prepare();
  if (confirmations < 100) {
    await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  } else {
    await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  }
});

test('a new review checks current ownership after a transfer with an unknown response', async () => {
  const plan = await prepare();
  const send = mockSend.getMockImplementation();
  mockSend.mockImplementationOnce(async hex => {
    await send(hex);
    putIdentity('alice', {primaryaddresses: [otherAddress]});
    throw new Error('Response lost after acceptance');
  });
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  mockState.authentication.sessionEpoch++;
  await expect(load(captureIdentityUpdateContext())).rejects.toThrow('does not hold a primary signing key');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a new review uses current chain data instead of restoring an earlier attempt', async () => {
  const first = await prepare();
  mockSend.mockRejectedValueOnce(new Error('Transport disconnected'));
  await expect(sendIdentityUpdate(first)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  mockTip += 4;
  mockState.authentication.sessionEpoch++;
  const fresh = await prepare();
  await expect(sendIdentityUpdate(fresh)).resolves.toHaveProperty('txid');
  expect(mockBuild).toHaveBeenCalledTimes(2);
  expect(mockSign).toHaveBeenCalledTimes(2);
  expect(mockSend.mock.calls[1][0]).not.toBe(mockSend.mock.calls[0][0]);
  expect(mockReadStorage).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
});

test('copies the recipient identity signer list/threshold with self recovery and revocation', async () => {
  putIdentity('satoshi', {primaryaddresses: [otherAddress, thirdAddress], minimumsignatures: 2});
  const plan = await prepare({mode: 'transfer', recipient: 'satoshi@'});
  expect(plan.review).toMatchObject({recipientName: 'satoshi.VRSCTEST@', after: {
    primaryaddresses: [otherAddress, thirdAddress], minimumsignatures: 2, recoveryauthority: SUBJECT, revocationauthority: SUBJECT,
  }});
  expect(plan.review.losesControl).toBe(true);
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test('uses this network’s wallet private address for the modify shortcut', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST.dlight_private = {addresses: [PRIVATE]};
  mockState.authentication.activeAccount.keys.VRSC = {dlight_private: {addresses: [OTHER_PRIVATE]}};
  const model = await load();
  expect(model.walletPrivateAddress).toBe(PRIVATE);
  const plan = await prepareIdentityUpdate(model, {mode: 'modify', changes: {privateaddress: model.walletPrivateAddress}});
  expect(plan.review.after.privateaddress).toBe(PRIVATE);
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test.each([undefined, 'bad-private-address'])('does not offer an unavailable or invalid wallet private address (%s)', async privateAddress => {
  mockState.authentication.activeAccount.keys.VRSCTEST.dlight_private = {addresses: [privateAddress]};
  mockState.authentication.activeAccount.keys.VRSC = {dlight_private: {addresses: [OTHER_PRIVATE]}};
  expect((await load()).walletPrivateAddress).toBe('');
});

test('copies the recipient private address into the reviewed and signed identity output', async () => {
  putIdentity('alice', {privateaddress: PRIVATE});
  putIdentity('satoshi', {primaryaddresses: [otherAddress], privateaddress: OTHER_PRIVATE});
  const plan = await prepare({mode: 'transfer', recipient: 'satoshi@'});
  expect(plan.review).toMatchObject({usesRecipientPrivateAddress: true,
    before: {privateaddress: PRIVATE}, after: {privateaddress: OTHER_PRIVATE}});
  await sendIdentityUpdate(plan);
  const transaction = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  const output = new IdentityScript();
  output.fromBuffer(transaction.outs[0].script);
  expect(output.getIdentity().privateAddresses[0].toAddressString()).toBe(OTHER_PRIVATE);
});

test('requires a new review when the recipient changes its private address', async () => {
  putIdentity('satoshi', {primaryaddresses: [otherAddress], privateaddress: PRIVATE});
  const plan = await prepare({mode: 'transfer', recipient: 'satoshi@'});
  putIdentity('satoshi', {primaryaddresses: [otherAddress], privateaddress: OTHER_PRIVATE});
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('supports an identity as the only payment source with the actual SDK signer', async () => {
  putFunding(FUNDING_ID);
  const model = await load();
  expect(model.fundingSources).toEqual(expect.arrayContaining([expect.objectContaining({address: FUNDING_ID, isIdentity: true})]));
  const plan = await prepareIdentityUpdate(model, {mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review.fundingName).toBe('funds.VRSCTEST@');
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test.each([
  [{flags: 0x8000}, 'revoked'],
  [{primaryaddresses: [address, otherAddress], minimumsignatures: 2}, 'multiple signatures'],
  [{primaryaddresses: [otherAddress]}, 'primary signing key'],
])('rejects unsupported current ownership %j', async (changes, error) => {
  putIdentity('alice', changes);
  await expect(load()).rejects.toThrow(error);
  expect(mockBuild).not.toHaveBeenCalled();
});

test('allows a locked subject to transfer using separate unlocked funds and retains its lock', async () => {
  putIdentity('alice', {flags: 2, timelock: 100});
  const model = await load();
  expect(model.locked).toBe(true);
  const plan = await prepareIdentityUpdate(model, {mode: 'transfer', recipient: otherAddress});
  expect(mockBuild.mock.calls[0][0].identity.isLocked()).toBe(true);
  expect(plan.review.warnings.join(' ')).toContain('does not unlock');
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test('rejects tokenized transfers that would leave recovery powers with the token holder', async () => {
  putIdentity('alice', {flags: 5});
  await expect(prepare()).rejects.toThrow('control token');
  expect(mockBuild).not.toHaveBeenCalled();
});

test.each([{flags: 2}, {flags: 0, timelock: 101}, {flags: 0x8000}, {primaryaddresses: [otherAddress]}])('rejects unavailable identity funding %j', async changes => {
  putIdentity('funds', changes);
  putFunding(FUNDING_ID);
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID})).rejects.toThrow('payment identity');
  expect(mockBuild).not.toHaveBeenCalled();
});

test('requires the old recovery authority signature, not just the new authority', async () => {
  putIdentity('alice', {recoveryauthority: RECIPIENT});
  await expect(prepare({mode: 'modify', changes: {recoveryauthority: 'funds@'}})).rejects.toThrow('current signing authority');
  expect(mockBuild).not.toHaveBeenCalled();
});

test('permits authority changes when the wallet controls the current authority', async () => {
  const plan = await prepare({mode: 'modify', changes: {recoveryauthority: 'funds@', revocationauthority: 'funds@'}});
  expect(plan.review.after).toMatchObject({recoveryauthority: FUNDING_ID, revocationauthority: FUNDING_ID});
  expect(plan.review.identityNames[FUNDING_ID]).toBe('funds.VRSCTEST@');
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test.each(['satoshi', 'not-an-address'])('explains missing @ in recipient %s', async recipient => {
  await expect(prepare({mode: 'transfer', recipient})).rejects.toThrow('ending in @');
});

test('prevents a no-op transaction and payment', async () => {
  await expect(prepare({mode: 'transfer', recipient: address})).rejects.toThrow('Make a change');
  expect(mockBuild).not.toHaveBeenCalled();
});

test('rejects a different network and a substituted raw source transaction', async () => {
  mockWrongChain = true;
  await expect(load()).rejects.toThrow('different network');
  mockWrongChain = false;
  const original = mockGetUpdatable.getMockImplementation();
  mockGetUpdatable.mockImplementationOnce(async (...args) => {
    const data = await original(...args);
    const tx = Transaction.fromHex(data.tx, networks.verus);
    tx.locktime++;
    return {...data, tx: tx.toHex()};
  });
  await expect(load()).rejects.toThrow('transaction does not match');
});

test('gives an actionable error for raw-public-key controllers unsupported by the primitive decoder', async () => {
  mockGetUpdatable.mockRejectedValueOnce(new Error('Pubkey Principal not yet supported'));
  await expect(load()).rejects.toThrow('public-key controllers that this wallet cannot edit');
});

test('resolves parent and system names when the identity service can provide them', async () => {
  mockIdentities.set(SYSTEM, {identity: {identityaddress: SYSTEM}, fullyqualifiedname: 'VRSCTEST@'});
  const model = await load();
  expect(model.identityNames[SYSTEM]).toBe('VRSCTEST@');
  expect(model.isTestnet).toBe(true);
});

test('rejects account changes while loading the initial definition', async () => {
  const original = mockGetUpdatable.getMockImplementation();
  mockGetUpdatable.mockImplementationOnce(async (...args) => {
    const result = await original(...args);
    mockState.authentication.sessionEpoch++;
    return result;
  });
  await expect(load()).rejects.toMatchObject({code: 'SESSION_CHANGED'});
});

test.each(['subject', 'recipient', 'funding', 'recovery'])('requires another review when %s changes before approval', async target => {
  if (target === 'recovery') putIdentity('alice', {recoveryauthority: FUNDING_ID});
  if (target === 'funding') putFunding(FUNDING_ID);
  const plan = await prepare(target === 'recovery'
    ? {mode: 'modify', changes: {recoveryauthority: SUBJECT}}
    : {mode: 'transfer', recipient: 'satoshi@', ...(target === 'funding' ? {fundingAddress: FUNDING_ID} : {})});
  putIdentity(target === 'subject' ? 'alice' : target === 'recipient' ? 'satoshi' : 'funds', {primaryaddresses: [thirdAddress]});
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('rejects spent fee inputs before signing', async () => {
  const plan = await prepare();
  mockGetTxOut.mockResolvedValueOnce(ok(null));
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
});

test('rejects a stale session, including a switch during authentication', async () => {
  const context = captureIdentityUpdateContext();
  const plan = await prepare(undefined, context);
  mockGetKey.mockImplementationOnce(async () => {
    mockState.authentication.sessionEpoch++;
    return key.toWIF();
  });
  await expect(sendIdentityUpdate(plan, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
});

test('checks the returned private key matches the approved wallet', async () => {
  const plan = await prepare();
  mockGetKey.mockResolvedValue(otherKey.toWIF());
  await expect(sendIdentityUpdate(plan)).rejects.toThrow('signing key does not match');
  expect(mockSign).not.toHaveBeenCalled();
});

test.each(['before', 'during authentication'])('checks transaction expiry %s', async timing => {
  const plan = await prepare();
  if (timing === 'before') mockTip += 20;
  else mockGetKey.mockImplementationOnce(async () => {mockTip += 20; return key.toWIF();});
  await expect(sendIdentityUpdate(plan)).rejects.toThrow('expired');
  expect(mockSign).not.toHaveBeenCalled();
});

test('independently rejects signer mutations to the approved outputs', async () => {
  const plan = await prepare();
  const sign = mockSign.getMockImplementation();
  mockSign.mockImplementationOnce((...args) => {
    const tx = Transaction.fromHex(sign(...args), networks.verus);
    tx.outs[1].value -= 1;
    return tx.toHex();
  });
  await expect(sendIdentityUpdate(plan)).rejects.toThrow('differs from your approved update');
  expect(mockSend).not.toHaveBeenCalled();
});

test('checks intended identity bytes even if the SDK mutates its input object', async () => {
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(args => {
    args.identity.setPrimaryAddresses([thirdAddress]);
    return build(args);
  });
  await expect(prepare()).rejects.toThrow('differs from the changes you requested');
  expect(mockGetKey).not.toHaveBeenCalled();
});

test('rejects a missing signature instead of broadcasting an incomplete update', async () => {
  const plan = await prepare();
  mockSign.mockImplementationOnce((_system, hex) => hex);
  await expect(sendIdentityUpdate(plan)).rejects.toThrow('missing a required signature');
  expect(mockSend).not.toHaveBeenCalled();
});

test('requires an offered funding source and available fee funds', async () => {
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: otherAddress})).rejects.toThrow('belonging to this wallet');
  mockGetUtxos.mockResolvedValue([]);
  await expect(prepare()).rejects.toThrow('no spendable funds');
  expect(mockBuild).not.toHaveBeenCalled();
});

test('keeps review immutable and rejects manufactured approval objects', async () => {
  const plan = await prepare();
  expect(Object.isFrozen(plan.review.after.primaryaddresses)).toBe(true);
  await expect(sendIdentityUpdate({review: plan.review})).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockGetKey).not.toHaveBeenCalled();
});

test('caps ordinary update fees and computes a larger cap only for large valid definitions', async () => {
  mockFee = 100001;
  await expect(prepare()).rejects.toThrow('maximum');
  mockFee = 240000;
  const primaryaddresses = Array.from({length: 25}, (_, index) => ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, index + 21), networks.verus).getAddress());
  const plan = await prepare({mode: 'modify', changes: {primaryaddresses}});
  expect(mockBuild.mock.calls[1][0].maxFee).toBe(0.0024);
  expect(plan.review.fee).toBe('0.0024');
});

test('does not inflate the fee allowance by replaying historical content-multimap operations', async () => {
  putIdentity('alice', {contentmultimap: {[RECIPIENT]: ['ab'.repeat(2048)]}});
  const plan = await prepare({mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}});
  expect(mockBuild.mock.calls[0][0].maxFee).toBe(0.001);
  expect(mockBuild.mock.calls[0][0].identity.contentMultiMap.kvContent.size).toBe(0);
  expect(plan.review.fee).toBe('0.0001');
  mockFee = 100001;
  await expect(prepare({mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}})).rejects.toThrow('maximum');
});

test('rejects unexpected non-native fees but permits explicit zero currency deltas', async () => {
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const result = await build(args);
    result.deltas.set(RECIPIENT, new BN(0));
    return result;
  });
  await expect(prepare()).resolves.toHaveProperty('review');
  mockBuild.mockImplementationOnce(async args => {
    const result = await build(args);
    result.deltas.set(RECIPIENT, new BN(-1));
    return result;
  });
  await expect(prepare()).rejects.toThrow('fee currency');
});

test.each(['timeout', 'null rejection', 'RPC error', 'wrong transaction ID', 'missing response', 'missing transaction ID', 'malformed transaction ID', 'synchronous error'])('a %s records handoff without acknowledging delivery or resending', async outcome => {
  const plan = await prepare();
  const send = jest.spyOn(mockClient.interface, 'sendRawTransaction');
  if (outcome === 'timeout') send.mockRejectedValueOnce(new Error('Connection timed out'));
  else if (outcome === 'null rejection') send.mockRejectedValueOnce(null);
  else if (outcome === 'RPC error') send.mockResolvedValueOnce({error: {code: -1, message: 'Rejected'}});
  else if (outcome === 'missing response') send.mockResolvedValueOnce(null);
  else if (outcome === 'missing transaction ID') send.mockResolvedValueOnce({});
  else if (outcome === 'malformed transaction ID') send.mockResolvedValueOnce(ok({txid: 'ab'.repeat(32)}));
  else if (outcome === 'synchronous error') send.mockImplementationOnce(() => {throw new Error('Transport failed');});
  else send.mockResolvedValueOnce(ok('ab'.repeat(32)));
  const error = await sendIdentityUpdate(plan).catch(value => value);
  const txid = Transaction.fromHex(send.mock.calls[0][0], networks.verus).getId();
  expect(error).toMatchObject({code: 'BROADCAST_UNKNOWN', txid, submitted: true});
  expect(error.message).toContain('Check its status before starting a new review');
  const lookup = jest.spyOn(mockClient.interface, 'getRawTransaction');
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN', txid, submitted: true});
  expect(lookup).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockGetKey).toHaveBeenCalledTimes(1);
});

test('preserves session cancellation with the local transaction ID after handoff', async () => {
  const context = captureIdentityUpdateContext();
  const plan = await prepare(undefined, context);
  mockSend.mockImplementationOnce(async hex => {
    mockState.authentication.sessionEpoch++;
    return ok(Transaction.fromHex(hex, networks.verus).getId());
  });
  const error = await sendIdentityUpdate(plan, context).catch(value => value);
  const txid = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId();
  expect(error).toMatchObject({code: 'SESSION_CHANGED', txid, submitted: true});
  await expect(sendIdentityUpdate(plan, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('prevents two simultaneous approval taps', async () => {
  const plan = await prepare();
  let release;
  mockGetKey.mockImplementationOnce(() => new Promise(resolve => {release = resolve;}));
  const first = sendIdentityUpdate(plan);
  await expect(sendIdentityUpdate(plan)).rejects.toThrow('already being sent');
  while (!release) await Promise.resolve();
  release(key.toWIF());
  await expect(first).resolves.toHaveProperty('txid');
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('returns every native identity output atomically, with the fee paid by the main wallet', async () => {
  const first = putSubjectFunds({[SYSTEM]: '100000000'});
  const second = putSubjectFunds({[SYSTEM]: '200000000'});
  mockFee = 20000;
  const plan = await prepare();
  expect(plan.review).toMatchObject({returnFunds: true, returnAddress: address, changeAddress: address,
    returnedFunds: [{currencyId: SYSTEM, amount: '3', amountSatoshis: '300000000'}],
    transferredFunds: [], nativeTotalCost: '0.0002', fundingChange: [{amount: '0.9998'}]});
  await sendIdentityUpdate(plan);
  const inputs = mockSign.mock.calls[0][2];
  expect(inputs).toEqual(expect.arrayContaining([expect.objectContaining({txid: first.txid}), expect.objectContaining({txid: second.txid})]));
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(signed.outs.slice(1).every(output => unpackOutput(output, SYSTEM).destinations.every(destination => destination === address))).toBe(true);
  expect(signed.ins).toHaveLength(4); // Both identity balances, fee source, identity definition.
});

test('returns mixed and token-only balances without trusting advertised currencyvalues', async () => {
  putSubjectFunds({[SYSTEM]: '123456789', [RECIPIENT]: '800000001'}, {currencyvalues: {[RECIPIENT]: 999999999}});
  putSubjectFunds({[FUNDING_ID]: '900000000'});
  const plan = await prepare();
  expect(plan.review.returnedFunds).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amountSatoshis: '123456789'}),
    expect.objectContaining({currencyId: RECIPIENT, amountSatoshis: '800000001'}),
    expect.objectContaining({currencyId: FUNDING_ID, amountSatoshis: '900000000'}),
  ]));
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  expect(mockSign.mock.calls[0][2]).toHaveLength(4);
});

test('returns all funds and deducts the exact fee from the identity when the main wallet has no funds', async () => {
  putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '700000000'});
  putSubjectFunds({[SYSTEM]: '50000000'});
  mockGetUtxos.mockResolvedValue([]);
  mockFee = 20000;
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: SUBJECT});
  expect(plan.review.returnedFunds).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amount: '1.4998'}),
    expect.objectContaining({currencyId: RECIPIENT, amount: '7'}),
  ]));
  expect(plan.review).toMatchObject({fee: '0.0002', nativeTotalCost: '0.0002', fundingChange: []});
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  expect(mockSign.mock.calls[0][2]).toHaveLength(3);
});

test('returns funds to the main wallet even when transferring to a multi-primary recipient', async () => {
  putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '700000000'});
  putIdentity('satoshi', {primaryaddresses: [otherAddress, thirdAddress], minimumsignatures: 2});
  const plan = await prepare({mode: 'transfer', recipient: 'satoshi@', fundingAddress: SUBJECT});
  expect(plan.review.after).toMatchObject({primaryaddresses: [otherAddress, thirdAddress], minimumsignatures: 2,
    recoveryauthority: SUBJECT, revocationauthority: SUBJECT});
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test('keeps a large fee-source identity balance at its original identity while returning only subject funds', async () => {
  putSubjectFunds({[SYSTEM]: '100000000'});
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000000'});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review).toMatchObject({fundingName: 'funds.VRSCTEST@', changeAddress: FUNDING_ID,
    changeName: 'funds.VRSCTEST@', fundingChange: [{amount: '999.9999'}], returnedFunds: [{amount: '1'}]});
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(outputAmountsAt(signed, address)).toEqual({[SYSTEM]: '100000000'});
  expect(outputAmountsAt(signed, FUNDING_ID)).toEqual({[SYSTEM]: '99999990000'});
});

test('unchecked return includes all currencies relinquished in costs, without counting a subject-funded fee twice', async () => {
  putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '123000000'});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds: false, fundingAddress: SUBJECT});
  expect(plan.review).toMatchObject({returnFunds: false, returnedFunds: [], fee: '0.0001', nativeTotalCost: '1', changeAddress: SUBJECT});
  expect(plan.review.transferredFunds).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amount: '0.9999'}),
    expect.objectContaining({currencyId: RECIPIENT, amount: '1.23'}),
  ]));
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});

test('unchecked return adds a separately funded fee to the identity assets being transferred', async () => {
  putSubjectFunds({[SYSTEM]: '100000000'});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds: false});
  expect(plan.review).toMatchObject({nativeTotalCost: '1.0001', transferredFunds: [{currencyId: SYSTEM, amount: '1'}]});
  expect(mockBuild.mock.calls[0][0].utxos).toHaveLength(1);
});

test.each([true, false])('requires renewed approval for new confirmed identity funds (return %s)', async returnFunds => {
  putSubjectFunds();
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds});
  putSubjectFunds({[RECIPIENT]: '1'});
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
});

test.each([true, false])('rejects pending identity deposits at review and after authentication (return %s)', async returnFunds => {
  mockPending = [{txid: 'ab'.repeat(32), satoshis: 1}];
  await expect(prepare({mode: 'transfer', recipient: otherAddress, returnFunds})).rejects.toThrow('pending transactions');
  mockPending = [];
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds});
  mockGetKey.mockImplementationOnce(async () => {
    mockPending = [{txid: 'bc'.repeat(32), satoshis: 1}];
    return key.toWIF();
  });
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
});

test('rejects unsupported return addresses, unavailable outputs, and insufficient self-funded native balance', async () => {
  await expect(prepare({mode: 'transfer', recipient: otherAddress, returnAddress: otherAddress})).rejects.toThrow('main transparent address');
  putSubjectFunds(undefined, {isspendable: false});
  await expect(prepare()).rejects.toThrow('locked or unavailable funds');
  mockSubjectFunding = [];
  putSubjectFunds({[RECIPIENT]: '500000000'});
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: SUBJECT})).rejects.toThrow('no native currency');
  expect(mockSign).not.toHaveBeenCalled();
});

test('locked funds can stay with a transferred identity, but cannot be promised returned', async () => {
  putIdentity('alice', {flags: 2, timelock: 100});
  putSubjectFunds();
  await expect(prepare()).rejects.toThrow('locked or unavailable');
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds: false});
  expect(plan.review.transferredFunds).toEqual([expect.objectContaining({amount: '1'})]);
});

test('checks all subject inputs remain present after daemon funding, rather than silently returning only part', async () => {
  putSubjectFunds();
  putSubjectFunds({[SYSTEM]: '200000000'});
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const result = await build(args);
    result.utxos = result.utxos.filter(input => input.txid !== mockSubjectFunding[0].txid);
    return result;
  });
  await expect(prepare()).rejects.toThrow('did not return all identity funds');
  expect(mockGetKey).not.toHaveBeenCalled();
});

test.each([
  [0.0002, 'does not match'],
  [10, 'outside the permitted'],
  [0.000100001, 'outside the permitted'],
])('rejects an invalid daemon fee quote %s before constructing a self-funded sweep', async (fee, message) => {
  putSubjectFunds();
  const fund = mockClient.interface.fundRawTransaction.bind(mockClient.interface);
  jest.spyOn(mockClient.interface, 'fundRawTransaction').mockImplementationOnce(async (...args) => {
    const result = await fund(...args);
    return {...result, result: {...result.result, fee}};
  });
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: SUBJECT})).rejects.toThrow(message);
  expect(mockBuild).not.toHaveBeenCalled();
  expect(mockGetKey).not.toHaveBeenCalled();
});

test('rejects fee quotes which replace the offered inputs', async () => {
  putSubjectFunds();
  const fund = mockClient.interface.fundRawTransaction.bind(mockClient.interface);
  jest.spyOn(mockClient.interface, 'fundRawTransaction').mockImplementationOnce(async (...args) => {
    const result = await fund(...args);
    const quoted = Transaction.fromHex(result.result.hex, networks.verus);
    quoted.ins[0].hash = Buffer.from(mockFunding.txid, 'hex').reverse();
    return {...result, result: {...result.result, hex: quoted.toHex()}};
  });
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: SUBJECT})).rejects.toThrow('unexpected or duplicate inputs');
  expect(mockBuild).not.toHaveBeenCalled();
});

test('rejects an absurd fee on an externally funded sweep through the SDK validator', async () => {
  putSubjectFunds();
  mockFee = 900000;
  await expect(prepare()).rejects.toThrow('maximum');
  expect(mockGetKey).not.toHaveBeenCalled();
});

test('requires existing external recovery control before resetting authorities in a transfer', async () => {
  putIdentity('alice', {recoveryauthority: RECIPIENT});
  putSubjectFunds();
  await expect(prepare()).rejects.toThrow('current signing authority');
  expect(mockBuild).not.toHaveBeenCalled();
});

test.each(['confirmed', 'pending'])('does not resend a previously signed transfer after a new %s deposit', async type => {
  putSubjectFunds();
  const plan = await prepare();
  mockSend.mockRejectedValueOnce(new Error('Connection closed before delivery'));
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  if (type === 'confirmed') putSubjectFunds({[SYSTEM]: '1'});
  else mockPending = [{txid: 'ab'.repeat(32), satoshis: 1}];
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('preserves overlapping and unrelated fee-source tokens at the payment identity', async () => {
  const unrelated = nameAndParentAddrToIAddr('token', SYSTEM);
  putSubjectFunds({[SYSTEM]: '600000000', [RECIPIENT]: '700000001'});
  const nativeAndTokens = putFunding(FUNDING_ID, {[SYSTEM]: '100000000000', [RECIPIENT]: '300000005'});
  const tokenOnly = putFunding(FUNDING_ID, {[unrelated]: '900000000000000001'});
  mockGetUtxos.mockResolvedValue([nativeAndTokens, tokenOnly]);
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review.returnedFunds).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amountSatoshis: '600000000'}),
    expect.objectContaining({currencyId: RECIPIENT, amountSatoshis: '700000001'}),
  ]));
  expect(plan.review.fundingChange).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amountSatoshis: '99999990000'}),
    expect.objectContaining({currencyId: RECIPIENT, amountSatoshis: '300000005'}),
    expect.objectContaining({currencyId: unrelated, amountSatoshis: '900000000000000001'}),
  ]));
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(outputAmountsAt(signed, address)).toEqual({[SYSTEM]: '600000000', [RECIPIENT]: '700000001'});
  expect(outputAmountsAt(signed, FUNDING_ID)).toEqual({[SYSTEM]: '99999990000', [RECIPIENT]: '300000005', [unrelated]: '900000000000000001'});
});

test('keeps fee change at its original source when there are no identity funds to return', async () => {
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000000'});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review).toMatchObject({returnFunds: true, returnedFunds: [], changeAddress: FUNDING_ID});
  expect(mockBuild.mock.calls[0][0].currencyTransferOutputs).toBeUndefined();
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
  expect(outputAmountsAt(Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus), FUNDING_ID)).toEqual({[SYSTEM]: '99999990000'});
});

test.each(['redirect fee change', 'swap native amounts', 'swap reserve amounts'])('rejects daemon funding that would %s between return and change outputs', async mutation => {
  putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '300000000'});
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000000', [RECIPIENT]: '200000000'});
  const fund = mockClient.interface.fundRawTransaction.bind(mockClient.interface);
  jest.spyOn(mockClient.interface, 'fundRawTransaction').mockImplementationOnce(async (...args) => {
    const result = await fund(...args);
    const tx = Transaction.fromHex(result.result.hex, networks.verus);
    const returned = {[SYSTEM]: '100000000', [RECIPIENT]: '300000000'};
    const change = {[SYSTEM]: '99999990000', [RECIPIENT]: '200000000'};
    let changeDestination = FUNDING_ID;
    if (mutation === 'redirect fee change') changeDestination = address;
    if (mutation === 'swap native amounts') {returned[SYSTEM] = '100000001'; change[SYSTEM] = '99999989999';}
    if (mutation === 'swap reserve amounts') {returned[RECIPIENT] = '300000001'; change[RECIPIENT] = '199999999';}
    const output = (destination, currencies) => Transaction.fromHex(VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM,
      [{currencies, address: new TransferDestination({type: destination === address ? DEST_PKH : DEST_ID,
        destinationBytes: fromBase58Check(destination).hash})}], mockTip + 20), networks.verus).outs[0];
    tx.outs[1] = output(address, returned);
    tx.outs[2] = output(changeDestination, change);
    return {...result, result: {...result.result, hex: tx.toHex()}};
  });
  await expect(prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID})).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('passes the entire recipient signing policy into combined transaction validation', async () => {
  putSubjectFunds();
  putIdentity('satoshi', {primaryaddresses: [otherAddress, thirdAddress], minimumsignatures: 2});
  putFunding(FUNDING_ID);
  const plan = await prepare({mode: 'transfer', recipient: 'satoshi@', fundingAddress: FUNDING_ID});
  expect(mockBuild.mock.calls[0][0]).toMatchObject({changeAaddr: FUNDING_ID,
    expectedIdentityPrimaryAddresses: [otherAddress, thirdAddress], expectedIdentityMinimumSignatures: 2});
  expect(plan.review.fee).toBe('0.0001');
  await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
});
