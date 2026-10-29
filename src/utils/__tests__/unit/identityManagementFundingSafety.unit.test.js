// Independent adversarial harness: real SDK funding verification and signing,
// canonical scripts and transactions; only device state and RPC I/O are replaced.
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
jest.mock('../../auth/authBox', () => ({requestPrivKey: (...args) => mockGetKey(...args)}));
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

test.each([
  ['modify', {mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}}],
  ['leave identity funds', {mode: 'transfer', recipient: otherAddress, returnFunds: false}],
  ['return funds with no subject funds', {mode: 'transfer', recipient: otherAddress, returnFunds: true}],
])('%s rejects a selected-source index response containing another owned identity’s money', async (_label, options) => {
  const wrongSource = putFunding(FUNDING_ID, {[SYSTEM]: '100000000', [RECIPIENT]: '9007199254740993'});
  // A poisoned address index advertises the selected address and its script,
  // while the raw transaction authorizes a different ID with the same key.
  // Checking index metadata before the SDK verifies prevouts is insufficient.
  mockGetUtxos.mockResolvedValue([{...wrongSource, address, script: transparentScript(address).toString('hex')}]);
  await expect(prepare(options)).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('a linked identity lookup rejects another valid identity returned under the requested i-address', async () => {
  const actual = mockGetIdentity.getMockImplementation();
  mockGetIdentity.mockImplementation((system, identifier) => identifier === SUBJECT
    ? ok(mockIdentities.get(FUNDING_ID)) : actual(system, identifier));
  await expect(load()).rejects.toThrow();
  expect(mockBuild).not.toHaveBeenCalled();
  expect(mockGetKey).not.toHaveBeenCalled();
});

test.each([
  ['redirected change', transaction => { transaction.outs[1].script = transparentScript(otherAddress); }],
  ['native funds removed as an undisclosed fee', transaction => { transaction.outs[1].value = 1; }],
  ['a substituted identity definition', transaction => {
    const definition = new IdentityScript();
    definition.fromBuffer(transaction.outs[0].script);
    const substituted = definition.getIdentity();
    substituted.setPrimaryAddresses([thirdAddress]);
    transaction.outs[0].script = IdentityScript.fromIdentity(substituted).toBuffer();
  }],
])('independent accounting rejects %s even if the builder reports the originally approved fee and identity', async (_label, mutate) => {
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const built = await build(args);
    const transaction = Transaction.fromHex(built.hex, networks.verus);
    mutate(transaction);
    return {...built, hex: transaction.toHex()};
  });
  await expect(prepare()).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('ordinary funding keeps every reserve currency at the selected payment identity', async () => {
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000', [RECIPIENT]: '9007199254740993', [SUBJECT]: '77'});
  const plan = await prepare({mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}, fundingAddress: FUNDING_ID});
  expect(plan.review).toMatchObject({fee: '0.0001', changeAddress: FUNDING_ID});
  await sendIdentityUpdate(plan);
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(outputAmountsAt(signed, FUNDING_ID)).toEqual({[SYSTEM]: '99990000', [RECIPIENT]: '9007199254740993', [SUBJECT]: '77'});
  expect(outputAmountsAt(signed, address)).toEqual({});
});

test('unchecked transfer retains token-only and locked assets in its exact approved cost inventory', async () => {
  putSubjectFunds({[RECIPIENT]: '9007199254740993'}, {isspendable: false});
  putSubjectFunds({[SYSTEM]: '12345678', [FUNDING_ID]: '77'}, {isspendable: false});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, returnFunds: false});
  expect(plan.review).toMatchObject({nativeTotalCost: '0.12355678', returnedFunds: []});
  expect(plan.review.transferredFunds).toEqual(expect.arrayContaining([
    expect.objectContaining({currencyId: SYSTEM, amountSatoshis: '12345678'}),
    expect.objectContaining({currencyId: RECIPIENT, amountSatoshis: '9007199254740993'}),
    expect.objectContaining({currencyId: FUNDING_ID, amountSatoshis: '77'}),
  ]));
  await sendIdentityUpdate(plan);
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  const selected = new Set(signed.ins.map(input => Buffer.from(input.hash).reverse().toString('hex')));
  for (const asset of mockSubjectFunding) expect(selected.has(asset.txid)).toBe(false);
});

test.each([
  ['redirected payment change', transaction => { transaction.outs[1].script = transparentScript(otherAddress); }],
  ['extra native fee', transaction => { transaction.outs[1].value -= 1; }],
  ['substituted identity ownership', transaction => {
    const definition = new IdentityScript();
    definition.fromBuffer(transaction.outs[0].script);
    const changed = definition.getIdentity();
    changed.setPrimaryAddresses([thirdAddress]);
    transaction.outs[0].script = IdentityScript.fromIdentity(changed).toBuffer();
  }],
])('a signer cannot broadcast %s after approval', async (_label, mutate) => {
  const plan = await prepare();
  const sign = mockSign.getMockImplementation();
  mockSign.mockImplementationOnce((...args) => {
    const transaction = Transaction.fromHex(sign(...args), networks.verus);
    mutate(transaction);
    return transaction.toHex();
  });
  await expect(sendIdentityUpdate(plan)).rejects.toThrow();
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).not.toHaveBeenCalled();
});

test('a JSON clone of the public review cannot act as payment approval', async () => {
  const plan = await prepare();
  await expect(sendIdentityUpdate(JSON.parse(JSON.stringify(plan)))).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['-1', '-20000'])('reported fee delta %s must equal the transaction fee before presenting its cost', async dishonestFee => {
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const built = await build(args);
    // Keep legitimate transaction bytes and prevouts, but lie in display
    // metadata. A cap alone cannot make this misleading review trustworthy.
    built.deltas.set(SYSTEM, new BN(dishonestFee));
    return built;
  });
  await expect(prepare()).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('ordinary change cannot lose reserve currency even when all reported fee deltas are native', async () => {
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000', [RECIPIENT]: '9007199254740993'});
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const built = await build(args);
    const transaction = Transaction.fromHex(built.hex, networks.verus);
    const replacement = Transaction.fromHex(VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM, [{
      currencies: {[SYSTEM]: '99990000', [RECIPIENT]: '9007199254740992'},
      address: new TransferDestination({type: DEST_ID, destinationBytes: fromBase58Check(FUNDING_ID).hash}),
    }], mockTip + 20), networks.verus).outs[0];
    transaction.outs[1] = replacement;
    return {...built, hex: transaction.toHex()};
  });
  await expect(prepare({mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}, fundingAddress: FUNDING_ID})).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('a self-consistent builder approval cannot change the locally requested return recipient', async () => {
  putSubjectFunds();
  const build = mockBuild.getMockImplementation();
  mockBuild.mockImplementationOnce(async args => {
    const built = await build(args);
    const redirect = hex => {
      const transaction = Transaction.fromHex(hex, networks.verus);
      transaction.outs[1].script = transparentScript(otherAddress);
      return transaction.toHex();
    };
    // Preserve conservation, fee, source, and identity. The SDK's independent
    // verifier can approve these bytes against this internally consistent
    // intent; Mobile must still bind that intent to the user's return address.
    const approval = JSON.parse(JSON.stringify(built.fundingApproval));
    approval.txHex = redirect(approval.txHex);
    approval.unfundedTxHex = redirect(approval.unfundedTxHex);
    return {...built, hex: redirect(built.hex), fundingApproval: approval};
  });
  await expect(prepare()).rejects.toThrow();
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('valid identity returns and mixed-currency fee change stay at their independently approved recipients', async () => {
  putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '77'});
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000', [RECIPIENT]: '9007199254740993'});
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review).toMatchObject({returnAddress: address, changeAddress: FUNDING_ID, fee: '0.0001'});
  await sendIdentityUpdate(plan);
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(outputAmountsAt(signed, address)).toEqual({[SYSTEM]: '100000000', [RECIPIENT]: '77'});
  expect(outputAmountsAt(signed, FUNDING_ID)).toEqual({[SYSTEM]: '99990000', [RECIPIENT]: '9007199254740993'});
  expect(outputAmountsAt(signed, otherAddress)).toEqual({});
});

test.each(['ordinary', 'sweep'])('accepts daemon-inserted %s change before the final intended output', async mode => {
  putFunding(FUNDING_ID, {[SYSTEM]: '100000000', [RECIPIENT]: '9007199254740993'});
  if (mode === 'sweep') putSubjectFunds({[SYSTEM]: '100000000', [RECIPIENT]: '77'});
  const fund = mockClient.interface.fundRawTransaction.bind(mockClient.interface);
  jest.spyOn(mockClient.interface, 'fundRawTransaction').mockImplementation(async (...args) => {
    const response = await fund(...args);
    const transaction = Transaction.fromHex(response.result.hex, networks.verus);
    const change = transaction.outs.pop();
    const changepos = transaction.outs.length - 1;
    transaction.outs.splice(changepos, 0, change);
    return {...response, result: {...response.result, hex: transaction.toHex(), changepos}};
  });
  const plan = await prepare(mode === 'ordinary'
    ? {mode: 'modify', changes: {primaryaddresses: [address, otherAddress]}, fundingAddress: FUNDING_ID}
    : {mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  expect(plan.review).toMatchObject({fee: '0.0001', changeAddress: FUNDING_ID});
  await sendIdentityUpdate(plan);
  const signed = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus);
  expect(outputAmountsAt(signed, FUNDING_ID)).toEqual({[SYSTEM]: '99990000', [RECIPIENT]: '9007199254740993'});
  expect(outputAmountsAt(signed, address)).toEqual(mode === 'sweep' ? {[SYSTEM]: '100000000', [RECIPIENT]: '77'} : {});
});

test.each([
  ['locked', {flags: 2}], ['countdown', {timelock: 101}], ['elapsed countdown', {timelock: 100}],
])('external recovery authority is checked at signing: %s', async (state, changes) => {
  putIdentity('alice', {recoveryauthority: FUNDING_ID});
  putIdentity('funds', changes);
  const plan = await prepare();
  if (state === 'elapsed countdown') {
    await expect(sendIdentityUpdate(plan)).resolves.toHaveProperty('txid');
    expect(mockSend).toHaveBeenCalledTimes(1);
  } else {
    await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'LOCKED_AUTHORITY'});
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  }
});

test('a funding identity countdown relocked by a reorg during authorization stops before signing', async () => {
  putIdentity('funds', {timelock: 100});
  putFunding(FUNDING_ID);
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  mockGetKey.mockImplementation(async () => {
    mockTip = 99;
    return key.toWIF();
  });
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'LOCKED_AUTHORITY'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('an attempted funding-identity update remains consumed after a countdown reorg', async () => {
  putIdentity('funds', {timelock: 100});
  putFunding(FUNDING_ID);
  const plan = await prepare({mode: 'transfer', recipient: otherAddress, fundingAddress: FUNDING_ID});
  mockSend.mockRejectedValueOnce(new Error('Connection timed out'));
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  mockTip = 99;
  await expect(sendIdentityUpdate(plan)).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});
