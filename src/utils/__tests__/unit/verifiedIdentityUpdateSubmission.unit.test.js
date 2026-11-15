let mockState;
const mockRead = jest.fn();
let mockClient;
const mockPersist = jest.fn();
const mockSend = jest.fn();
const mockLookup = jest.fn();
const mockInfo = jest.fn();
const mockBlock = jest.fn();
const mockIdentity = jest.fn();
const mockUnspent = jest.fn();
const mockSign = jest.fn();
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../auth/authBox', () => ({requestServiceStoredData: (...args) => mockRead(...args)}));
jest.mock('../../../actions/actions/services/dispatchers/services', () => ({modifyServiceStoredDataForUser: (...args) => mockPersist(...args)}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {getEndpoint: () => ({
  getInfo: mockInfo, getBlock: mockBlock, getIdentity: mockIdentity, getTxOut: mockUnspent, getRawTransaction: mockLookup, sendRawTransaction: mockSend,
})}}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({signUpdateIdentityTx: (...args) => mockSign(...args)}));

const {TransactionBuilder, Transaction, networks, ECPair, script} = require('@bitgo/utxo-lib');
const {Identity, IdentityScript, nameAndParentAddrToIAddr, fromBase58Check} = require('verus-typescript-primitives');
const {VerusIdInterface} = require('verusid-ts-client');
const {captureIdentityUpdateContext, submitReviewedIdentityUpdate,
  assertIdentityUpdateInputMaturity, requireIdentityFundingApproval} = require('../../identityUpdate/verifiedSubmission');
const SYSTEM = nameAndParentAddrToIAddr('VRSCTEST');
const ID = nameAndParentAddrToIAddr('subject', SYSTEM);
const KEY = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 8), networks.verus);
const ADDRESS = KEY.getAddress();
const ok = result => ({result});
const absent = () => ({error: {code: -5, message: 'Transaction not found'}});
let built;
let context;
let source;
const getKeys = jest.fn();
const builder = () => {
  const tx = new TransactionBuilder(networks.verus);
  tx.setVersion(4);
  tx.setVersionGroupId(0x892f2085);
  tx.setExpiryHeight(150);
  return tx;
};
const submit = () => submitReviewedIdentityUpdate({built, context, getKeys});

beforeEach(async () => {
  jest.resetAllMocks();
  mockState = {authentication: {activeAccount: {accountHash: 'account-a'}, sessionEpoch: 1},
    coins: {activeCoinsForUser: [{currency_id: SYSTEM, testnet: true}]}};
  mockRead.mockRejectedValue(new Error('Ordinary identity requests must not load saved state'));
  mockPersist.mockRejectedValue(new Error('Ordinary identity requests must not save state'));
  const identity = Identity.fromJson({version: 3, flags: 0, name: 'subject', parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: [ADDRESS], minimumsignatures: 1, recoveryauthority: ID, revocationauthority: ID, timelock: 0});
  const identityBuilder = builder();
  identityBuilder.addInput(Buffer.alloc(32, 9), 0);
  identityBuilder.addOutput(IdentityScript.fromIdentity(identity).toBuffer(), 0);
  const idTx = identityBuilder.buildIncomplete();
  const fundingBuilder = builder();
  fundingBuilder.addInput(Buffer.alloc(32, 10), 0);
  fundingBuilder.addOutput(script.pubKeyHash.output.encode(fromBase58Check(ADDRESS).hash), 100000000);
  source = fundingBuilder.buildIncomplete();
  const sources = new Map([[source.getId(), source], [idTx.getId(), idTx]]);
  const funding = {txid: source.getId(), outputIndex: 0, address: ADDRESS,
    script: source.outs[0].script.toString('hex'), satoshis: 100000000};
  mockClient = new VerusIdInterface(SYSTEM, 'https://offline.invalid', undefined, async request => {
    const [first] = request.params || [];
    switch (request.method) {
      case 'getinfo': return ok({blocks: 100, chainid: SYSTEM});
      case 'getrawtransaction': return ok(sources.get(first).toHex());
      case 'fundrawtransaction': {
        const tx = Transaction.fromHex(first, networks.verus);
        tx.addInput(Buffer.from(source.getId(), 'hex').reverse(), 0);
        tx.addOutput(source.outs[0].script, 99990000);
        return ok({hex: tx.toHex(), fee: 0.0001, changepos: 1});
      }
      default: throw new Error(`Unexpected RPC ${request.method}`);
    }
  });
  built = await mockClient.createUpdateIdentityTransaction(identity, ADDRESS, idTx.toHex(), 50,
    [funding], SYSTEM, 0.001, undefined, 100);
  context = captureIdentityUpdateContext({systemId: SYSTEM, isTestnet: true, changeAddress: ADDRESS, identityAddress: ID});
  mockInfo.mockResolvedValue(ok({blocks: 100, longestchain: 999, chainid: SYSTEM}));
  mockIdentity.mockResolvedValue(ok({txid: idTx.getId(), vout: 0}));
  mockUnspent.mockResolvedValue(ok({confirmations: 200}));
  mockLookup.mockResolvedValue(absent());
  mockSend.mockImplementation(async hex => ok(Transaction.fromHex(hex, networks.verus).getId()));
  getKeys.mockImplementation(async () => built.utxos.map(() => [KEY.toWIF()]));
  mockSign.mockImplementation((_system, hex, inputs, keys, approval, lockContext) => mockClient.signUpdateIdentityTransaction(hex, inputs, keys, approval, lockContext));
});

afterEach(() => {
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
});

test('signs the original approval and input order, then checks the locally derived txid', async () => {
  const response = await submit();
  const signedHex = mockSend.mock.calls[0][0];

  expect(response.txid).toBe(Transaction.fromHex(signedHex, networks.verus).getId());
  expect(mockSign.mock.calls[0][2]).toBe(built.utxos);
  expect(mockSign.mock.calls[0][4]).toBe(built.fundingApproval);
  expect(mockSign.mock.calls[0][5]).toEqual({chainId: SYSTEM, nextBlockHeight: 101});
  expect(mockSign.mock.invocationCallOrder[0]).toBeLessThan(mockSend.mock.invocationCallOrder[0]);
});

test('ordinary identity reviews still require an active account', () => {
  mockState.authentication.activeAccount = null;

  expect(() => captureIdentityUpdateContext({systemId: SYSTEM})).toThrow(/Account changed/);
  expect(getKeys).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

const startSignedOutReview = () => {
  mockState.authentication.activeAccount = null;
  mockState.coins = {};
  mockState.sendModal = {requestId: 'imported-key-review'};
  context = captureIdentityUpdateContext({
    systemId: SYSTEM,
    modalRequestId: mockState.sendModal.requestId,
    allowSignedOut: true,
  });
};

test('an opted-in signed-out review signs and submits with the supplied key', async () => {
  startSignedOutReview();

  const response = await submit();

  expect(context.sessionScope.accountHash).toBeNull();
  expect(getKeys).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(response.txid).toBe(Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId());
});

test.each(['login', 'session change', 'close', 'replacement'])(
  '%s during signed-out key derivation cancels before signing or sending', async change => {
    startSignedOutReview();
    getKeys.mockImplementation(async () => {
      if (change === 'login') mockState.authentication.activeAccount = {accountHash: 'account-a'};
      if (change === 'session change') mockState.authentication.sessionEpoch += 1;
      if (change === 'close') mockState.sendModal.requestId = null;
      if (change === 'replacement') mockState.sendModal.requestId = 'another-dialog';
      return built.utxos.map(() => [KEY.toWIF()]);
    });

    await expect(submit()).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  },
);

test('missing approval stops before key authorization, signing or broadcasting', async () => {
  built = {...built, fundingApproval: undefined};
  await expect(submit()).rejects.toThrow(/Missing verified/);
  expect(getKeys).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['change', 'amount', 'source'])('real SDK rejects substituted %s before signing', async mutation => {
  if (mutation === 'source') built = {...built, utxos: built.utxos.map((input, index) => index ? input : {...input, satoshis: input.satoshis + 1})};
  else {
    const tx = Transaction.fromHex(built.hex, networks.verus);
    if (mutation === 'amount') tx.outs[1].value -= 1;
    else tx.outs[1].script = script.pubKeyHash.output.encode(Buffer.alloc(20, 99));
    built = {...built, hex: tx.toHex()};
  }
  await expect(submit()).rejects.toThrow();
  expect(getKeys).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['timeout', 'missing', 'wrong txid', 'malformed txid', 'rpc error', 'synchronous throw', 'empty rejection'])(
  '%s remains submitted with unknown delivery without saving or retransmitting it', async outcome => {
    if (outcome === 'timeout') mockSend.mockRejectedValueOnce(new Error('Connection timed out'));
    else if (outcome === 'missing') mockSend.mockResolvedValueOnce({});
    else if (outcome === 'wrong txid') mockSend.mockResolvedValueOnce(ok('00'.repeat(32)));
    else if (outcome === 'malformed txid') mockSend.mockResolvedValueOnce(ok({txid: 'invalid'}));
    else if (outcome === 'synchronous throw') mockSend.mockImplementationOnce(() => { throw new Error('Connection failed'); });
    else if (outcome === 'empty rejection') mockSend.mockRejectedValueOnce(null);
    else mockSend.mockResolvedValueOnce({error: {code: -1, message: 'RPC unavailable'}});

    const error = await submit().catch(value => value);
    const txid = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId();
    expect(error).toMatchObject({code: 'BROADCAST_UNKNOWN', txid, submitted: true});
    await expect(submit()).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN', txid, submitted: true});

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(getKeys).toHaveBeenCalledTimes(1);
    expect(mockLookup).not.toHaveBeenCalled();
  },
);

test('a pending RPC is already submitted but cannot be reported as acknowledged', async () => {
  let release;
  let started;
  const sending = new Promise(resolve => { started = resolve; });
  mockSend.mockImplementationOnce(() => new Promise(resolve => {
    release = resolve;
    started();
  }));
  const first = submit();
  await sending;
  const txid = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId();

  await expect(submit()).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN', txid, submitted: true});
  release(ok(txid));
  await expect(first).resolves.toEqual({txid});
  await expect(submit()).resolves.toEqual({txid});
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
});

test.each(['matching txid', 'wrong txid', 'RPC rejection'])(
  'a session change after handoff retains submitted status with %s', async outcome => {
    mockSend.mockImplementationOnce(async hex => {
      mockState.authentication.sessionEpoch += 1;
      if (outcome === 'RPC rejection') throw Object.assign(new Error('Account changed'), {code: 'SESSION_CHANGED'});
      return ok(outcome === 'matching txid' ? Transaction.fromHex(hex, networks.verus).getId() : '00'.repeat(32));
    });

    const error = await submit().catch(value => value);
    const txid = Transaction.fromHex(mockSend.mock.calls[0][0], networks.verus).getId();
    expect(error).toMatchObject({code: 'SESSION_CHANGED', submitted: true, txid});
    expect(mockSend).toHaveBeenCalledTimes(1);
  },
);

test('account changes while authorizing stop before signing', async () => {
  getKeys.mockImplementation(async () => {
    mockState.authentication.sessionEpoch += 1;
    return built.utxos.map(() => [KEY.toWIF()]);
  });
  const error = await submit().catch(value => value);
  expect(error).toMatchObject({code: 'SESSION_CHANGED'});
  expect(error).not.toHaveProperty('submitted');
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['network', 'identity', 'input', 'expiry'])('a changed %s blocks before signing', async change => {
  if (change === 'network') mockInfo.mockResolvedValue(ok({blocks: 100, chainid: 'other-chain'}));
  if (change === 'identity') mockIdentity.mockResolvedValue(ok({txid: '00'.repeat(32), vout: 0}));
  if (change === 'input') mockUnspent.mockResolvedValue(ok(null));
  if (change === 'expiry') mockInfo.mockResolvedValue(ok({blocks: 149, chainid: SYSTEM}));
  await expect(submit()).rejects.toThrow();
  expect(getKeys).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['NaN', '0', '-1'])('invalid request expiry %s is rejected at context capture', expiryHeight => {
  expect(() => captureIdentityUpdateContext({systemId: SYSTEM, isTestnet: true, request: {expiryHeight}})).toThrow(/expiry/);
});

test.each([
  ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', 99, false],
  ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', 100, true],
  [SYSTEM, 99, false], [SYSTEM, 100, true], ['other-chain', 148, false], ['other-chain', 149, true],
])('coinbase on %s with %i confirmations has maturity=%s', (systemId, confirmations, mature) => {
  const mined = Transaction.fromHex(source.toHex(), networks.verus);
  mined.ins[0].hash = Buffer.alloc(32);
  mined.ins[0].index = 0xffffffff;
  const input = {txid: mined.getId(), outputIndex: 0};
  const approval = {systemId, prevouts: [{...input, rawTransaction: mined.toHex()}]};
  const check = () => assertIdentityUpdateInputMaturity(approval, input, {confirmations});
  if (mature) expect(check).not.toThrow();
  else expect(check).toThrow(/mining reward/);
});

test('same-profile wallet-key changes while authorizing stop before signing', async () => {
  getKeys.mockImplementation(async () => {
    mockState.authentication.activeAccount.keys = {VRSCTEST: {vrpc: {addresses: ['changed-address']}}};
    return built.utxos.map(() => [KEY.toWIF()]);
  });
  await expect(submit()).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('a regenerated request gets a fresh review without restoring a previous signed transaction', async () => {
  mockSend.mockRejectedValueOnce(new Error('Disconnected'));
  await expect(submit()).rejects.toMatchObject({code: 'BROADCAST_UNKNOWN'});
  const previousHex = mockSend.mock.calls[0][0];
  const fresh = Transaction.fromHex(built.hex, networks.verus);
  fresh.expiryHeight += 10;
  const template = Transaction.fromHex(built.fundingApproval.unfundedTxHex, networks.verus);
  template.expiryHeight += 10;
  built = {...built, hex: fresh.toHex(), fundingApproval: {...built.fundingApproval,
    txHex: fresh.toHex(), unfundedTxHex: template.toHex()}};
  context = captureIdentityUpdateContext({systemId: SYSTEM, isTestnet: true, identityAddress: ID, changeAddress: ADDRESS});

  const response = await submit();

  expect(getKeys).toHaveBeenCalledTimes(2);
  expect(mockSign).toHaveBeenCalledTimes(2);
  expect(mockSend.mock.calls[1][0]).not.toBe(previousHex);
  expect(response.txid).toBe(Transaction.fromHex(mockSend.mock.calls[1][0], networks.verus).getId());
  expect(mockLookup).not.toHaveBeenCalled();
});

test('a second press after success returns the same result without another send', async () => {
  const response = await submit();

  await expect(submit()).resolves.toEqual(response);
  expect(getKeys).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a concurrent submission cannot sign or send while authorization is pending', async () => {
  let releaseKeys;
  let authorizationStarted;
  const started = new Promise(resolve => { authorizationStarted = resolve; });
  getKeys.mockImplementation(() => new Promise(resolve => {
    releaseKeys = () => resolve(built.utxos.map(() => [KEY.toWIF()]));
    authorizationStarted();
  }));
  const first = submit();
  await started;

  await expect(submit()).rejects.toThrow(/already being sent/);
  releaseKeys();
  await expect(first).resolves.toHaveProperty('txid');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a cancelled key prompt leaves the unsent review usable', async () => {
  getKeys.mockRejectedValueOnce(new Error('Cancelled'));

  await expect(submit()).rejects.toThrow('Cancelled');
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
  await expect(submit()).resolves.toHaveProperty('txid');
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('an incomplete signer result fails before consuming the review or sending', async () => {
  const sign = mockSign.getMockImplementation();
  mockSign.mockImplementationOnce((...args) => {
    const partial = Transaction.fromHex(sign(...args), networks.verus);
    partial.ins[0].script = Buffer.alloc(0);
    return partial.toHex();
  });

  await expect(submit()).rejects.toThrow(/missing a required signature/);
  expect(mockSend).not.toHaveBeenCalled();
  await expect(submit()).resolves.toHaveProperty('txid');
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a 2-of-2 identity cannot be signed with only one controlling key', async () => {
  const approval = JSON.parse(JSON.stringify(built.fundingApproval));
  const previous = approval.prevouts.find(input => input.txid === approval.identity.txid);
  const definitionTx = Transaction.fromHex(previous.rawTransaction, networks.verus);
  const definitionScript = new IdentityScript();
  definitionScript.fromBuffer(definitionTx.outs[approval.identity.outputIndex].script);
  const identity = definitionScript.getIdentity();
  const second = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 12), networks.verus);
  identity.setPrimaryAddresses([ADDRESS, second.getAddress()]);
  identity.minSigs = new (require('verus-typescript-primitives').BigNumber)(2);
  const updatedScript = IdentityScript.fromIdentity(identity).toBuffer();
  definitionTx.outs[approval.identity.outputIndex].script = updatedScript;
  const oldId = approval.identity.txid;
  approval.identity.txid = definitionTx.getId();
  previous.txid = definitionTx.getId();
  previous.rawTransaction = definitionTx.toHex();
  const funded = Transaction.fromHex(built.hex, networks.verus);
  const oldInput = funded.ins.find(input => Buffer.from(input.hash).reverse().toString('hex') === oldId);
  oldInput.hash = Buffer.from(definitionTx.getId(), 'hex').reverse();
  funded.outs[0].script = updatedScript;
  const template = Transaction.fromHex(approval.unfundedTxHex, networks.verus);
  template.outs[0].script = updatedScript;
  approval.unfundedTxHex = template.toHex();
  approval.txHex = funded.toHex();
  built = {...built, hex: funded.toHex(), fundingApproval: approval, utxos: built.utxos.map(input => input.txid !== oldId ? input : {
    ...input, txid: definitionTx.getId(), rawTransaction: definitionTx.toHex(), script: updatedScript.toString('hex'),
  })};
  mockIdentity.mockResolvedValue(ok({txid: definitionTx.getId(), vout: approval.identity.outputIndex}));
  await expect(submit()).rejects.toThrow(/required signatures/);
  expect(getKeys).toHaveBeenCalledTimes(1);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('a payment key that does not control an approved input stops before signing', async () => {
  const different = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 13), networks.verus);
  // Selector/signing metadata is not the independently retained raw-source
  // authority, even when an attacker substitutes the key's own address here.
  built = {...built, utxos: built.utxos.map(input => ({...input, address: different.getAddress()}))};
  getKeys.mockResolvedValue(built.utxos.map(() => [different.toWIF()]));
  await expect(submit()).rejects.toThrow(/signing key/);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
});

test.each(['recovery', 'revocation'].flatMap(field => [
  [field, 'missing key', 0, 0], [field, 'locked', 2, 0],
  [field, 'countdown', 0, 101], [field, 'elapsed countdown', 0, 100],
  [field, 'reorganized countdown', 0, 100],
]))('changing %s validates the previous authority with %s', async (field, state, flags, timelock) => {
  const authorityId = nameAndParentAddrToIAddr('authority', SYSTEM);
  const different = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 14), networks.verus);
  const authority = Identity.fromJson({version: 3, flags, name: 'authority', parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: [state === 'missing key' ? different.getAddress() : ADDRESS], minimumsignatures: 1,
    recoveryauthority: authorityId, revocationauthority: authorityId, timelock});
  const authorityBuilder = builder();
  authorityBuilder.addInput(Buffer.alloc(32, 16), 0);
  authorityBuilder.addOutput(IdentityScript.fromIdentity(authority).toBuffer(), 0);
  const authorityTx = authorityBuilder.buildIncomplete();
  const approval = JSON.parse(JSON.stringify(built.fundingApproval));
  const previous = approval.prevouts.find(input => input.txid === approval.identity.txid);
  const definitionTx = Transaction.fromHex(previous.rawTransaction, networks.verus);
  const definitionScript = new IdentityScript();
  definitionScript.fromBuffer(definitionTx.outs[approval.identity.outputIndex].script);
  const before = definitionScript.getIdentity();
  if (field === 'recovery') before.setRecovery(authorityId);
  else before.setRevocation(authorityId);
  definitionTx.outs[approval.identity.outputIndex].script = IdentityScript.fromIdentity(before).toBuffer();
  const oldId = approval.identity.txid;
  approval.identity.txid = definitionTx.getId();
  previous.txid = definitionTx.getId();
  previous.rawTransaction = definitionTx.toHex();
  const funded = Transaction.fromHex(built.hex, networks.verus);
  funded.ins.find(input => Buffer.from(input.hash).reverse().toString('hex') === oldId).hash = Buffer.from(definitionTx.getId(), 'hex').reverse();
  approval.txHex = funded.toHex();
  built = {...built, hex: funded.toHex(), fundingApproval: approval, utxos: built.utxos.map(input => input.txid !== oldId ? input : {
    ...input, txid: definitionTx.getId(), rawTransaction: definitionTx.toHex(), script: definitionTx.outs[0].script.toString('hex'),
  })};
  mockIdentity.mockImplementation(async address => ok({txid: address === ID ? definitionTx.getId() : authorityTx.getId(), vout: 0}));
  mockLookup.mockImplementation(async () => {
    if (state === 'reorganized countdown') mockInfo.mockResolvedValue(ok({blocks: 99, chainid: SYSTEM}));
    return ok(authorityTx.toHex());
  });
  if (state === 'elapsed countdown') {
    await expect(submit()).resolves.toHaveProperty('txid');
    expect(mockSend).toHaveBeenCalledTimes(1);
  } else {
    await expect(submit()).rejects.toThrow(state === 'missing key' ? /required signatures/ : /is locked/);
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  }
});

test.each(['revocation only', 'new content', 'new primary address'])('external revocation of a content-bearing identity checks %s', async edit => {
  const {DataStringKey} = require('verus-typescript-primitives');
  const owner = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 23), networks.verus);
  const authorityId = nameAndParentAddrToIAddr('revoker', SYSTEM);
  const current = Identity.fromJson({version: 3, flags: 0, name: 'subject', parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: [owner.getAddress()], minimumsignatures: 1,
    recoveryauthority: authorityId, revocationauthority: authorityId, timelock: 0,
    contentmultimap: {[DataStringKey.vdxfid]: ['aabb']},
  });
  const currentBuilder = builder();
  currentBuilder.addInput(Buffer.alloc(32, 24), 0);
  currentBuilder.addOutput(IdentityScript.fromIdentity(current).toBuffer(), 0);
  const currentTx = currentBuilder.buildIncomplete();
  const authority = Identity.fromJson({version: 3, flags: 0, name: 'revoker', parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: [ADDRESS], minimumsignatures: 1,
    recoveryauthority: authorityId, revocationauthority: authorityId, timelock: 0});
  const authorityBuilder = builder();
  authorityBuilder.addInput(Buffer.alloc(32, 25), 0);
  authorityBuilder.addOutput(IdentityScript.fromIdentity(authority).toBuffer(), 0);
  const authorityTx = authorityBuilder.buildIncomplete();
  const sources = new Map([[currentTx.getId(), currentTx], [authorityTx.getId(), authorityTx], [source.getId(), source]]);
  mockClient = new VerusIdInterface(SYSTEM, 'https://offline.invalid', undefined, async request => {
    const [first] = request.params || [];
    if (request.method === 'getinfo') return ok({blocks: 100, chainid: SYSTEM});
    if (request.method === 'getidentity') return ok({identity: (first === ID ? current : authority).toJson(),
      txid: (first === ID ? currentTx : authorityTx).getId(), vout: 0, blockheight: 50});
    if (request.method === 'getrawtransaction') return ok(sources.get(first).toHex());
    if (request.method === 'fundrawtransaction') {
      const tx = Transaction.fromHex(first, networks.verus);
      tx.addInput(Buffer.from(source.getId(), 'hex').reverse(), 0);
      tx.addOutput(source.outs[0].script, 99990000);
      return ok({hex: tx.toHex(), fee: 0.0001, changepos: 1});
    }
    throw new Error(`Unexpected RPC ${request.method}`);
  });
  const funding = {txid: source.getId(), outputIndex: 0, address: ADDRESS,
    script: source.outs[0].script.toString('hex'), satoshis: 100000000};
  if (edit === 'revocation only') {
    built = await mockClient.createRevokeIdentityTransaction(current, ADDRESS, currentTx.toHex(), 50,
      [funding], SYSTEM, 0.001, undefined, 100);
  } else {
    const next = Identity.fromJson({...current.toJson(), ...(edit === 'new primary address' ? {primaryaddresses: [ADDRESS]} : {})});
    next.revoke();
    if (edit !== 'new content') next.clearContentMultiMap();
    built = await mockClient.createUpdateIdentityTransaction(next, ADDRESS, currentTx.toHex(), 50,
      [funding], SYSTEM, 0.001, undefined, 100);
  }
  expect(built.identity.isRevoked()).toBe(true);
  expect(built.identity.contentMultiMap.kvContent.size).toBe(edit === 'new content' ? 1 : 0);
  mockIdentity.mockImplementation(async address => ok({txid: address === ID ? currentTx.getId() : authorityTx.getId(), vout: 0}));
  mockLookup.mockImplementation(async txid => ok(sources.get(txid).toHex()));

  // Only the external revoker's key is available. Clearing old transaction-local
  // content needs no primary key; new content or ownership edits still do.
  getKeys.mockImplementation(async () => built.utxos.map(() => [KEY.toWIF()]));
  if (edit === 'revocation only') {
    await expect(submit()).resolves.toHaveProperty('txid');
    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  } else {
    await expect(submit()).rejects.toThrow(/required signatures/);
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  }
  expect(current.contentMultiMap.kvContent.size).toBe(1);
});

test.each(['P2PK', 'single controller', 'multiple controllers'])('funding signing policy comes from the actual %s script', async type => {
  const {SmartTransactionScript, OptCCParams, TxDestination, KeyID, BigNumber: BN} = require('verus-typescript-primitives');
  let fundingScript;
  if (type === 'P2PK') fundingScript = script.pubKey.output.encode(KEY.getPublicKeyBuffer());
  else {
    const other = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 19), networks.verus).getAddress();
    const destinations = [ADDRESS, ...(type === 'multiple controllers' ? [other] : [])].map(address => new TxDestination(KeyID.fromAddress(address)));
    const condition = () => new OptCCParams({version: new BN(3), evalCode: new BN(0), m: new BN(destinations.length), n: new BN(destinations.length), destinations, vData: []});
    fundingScript = new SmartTransactionScript(condition(), condition()).toBuffer();
  }
  const originalId = source.getId();
  const changed = Transaction.fromHex(source.toHex(), networks.verus);
  changed.outs[0].script = fundingScript;
  const approval = JSON.parse(JSON.stringify(built.fundingApproval));
  const previous = approval.prevouts.find(input => input.txid === originalId);
  previous.txid = changed.getId(); previous.rawTransaction = changed.toHex();
  const funded = Transaction.fromHex(built.hex, networks.verus);
  funded.ins.find(input => Buffer.from(input.hash).reverse().toString('hex') === originalId).hash = Buffer.from(changed.getId(), 'hex').reverse();
  approval.txHex = funded.toHex();
  built = {...built, hex: funded.toHex(), fundingApproval: approval, utxos: built.utxos.map(input => input.txid !== originalId ? input : {
    ...input, txid: changed.getId(), script: fundingScript.toString('hex'), rawTransaction: changed.toHex(),
  })};
  if (type === 'multiple controllers') {
    await expect(submit()).rejects.toThrow(/multiple controllers/);
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockPersist).not.toHaveBeenCalled();
  } else await expect(submit()).resolves.toHaveProperty('txid');
});

// A source countdown that has elapsed may be cleared only at the independently
// observed candidate height; context-free verification deliberately rejects it.
const expireSourceCountdown = () => {
  const approval = JSON.parse(JSON.stringify(built.fundingApproval));
  const previous = approval.prevouts.find(input => input.txid === approval.identity.txid);
  const definition = Transaction.fromHex(previous.rawTransaction, networks.verus);
  const identityScript = new IdentityScript();
  identityScript.fromBuffer(definition.outs[approval.identity.outputIndex].script);
  const identity = identityScript.getIdentity();
  identity.unlockAfter = new (require('verus-typescript-primitives').BigNumber)(100);
  const sourceScript = IdentityScript.fromIdentity(identity).toBuffer();
  definition.outs[approval.identity.outputIndex].script = sourceScript;
  const oldId = approval.identity.txid;
  approval.identity.txid = definition.getId();
  previous.txid = definition.getId();
  previous.rawTransaction = definition.toHex();
  const funded = Transaction.fromHex(built.hex, networks.verus);
  funded.ins.find(input => Buffer.from(input.hash).reverse().toString('hex') === oldId).hash =
    Buffer.from(definition.getId(), 'hex').reverse();
  approval.txHex = funded.toHex();
  built = {...built, hex: funded.toHex(), fundingApproval: approval, utxos: built.utxos.map(input => input.txid !== oldId ? input : {
    ...input, txid: definition.getId(), rawTransaction: definition.toHex(), script: sourceScript.toString('hex'),
  })};
  mockIdentity.mockResolvedValue(ok({txid: definition.getId(), vout: approval.identity.outputIndex}));
};

test('an elapsed countdown uses the active height throughout approval and signing', async () => {
  expireSourceCountdown();
  expect(() => requireIdentityFundingApproval(built)).toThrow(/unlock height/);
  expect(() => requireIdentityFundingApproval(built, {chainId: SYSTEM, nextBlockHeight: 101})).not.toThrow();

  await expect(submit()).resolves.toHaveProperty('txid');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSign.mock.calls[0][5]).toEqual({chainId: SYSTEM, nextBlockHeight: 101});
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a stale lock observation is replaced after key authorization', async () => {
  expireSourceCountdown();
  getKeys.mockImplementation(async () => {
    mockInfo.mockResolvedValue(ok({blocks: 99, longestchain: 500, chainid: SYSTEM}));
    return built.utxos.map(() => [KEY.toWIF()]);
  });
  await expect(submit()).rejects.toThrow(/unlock height/);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

// A loading spinner temporarily unmounts the SendModal form. Bind cancellation to
// the dialog request, which changes only when it closes or another opens.
test.each([null, 'replacement-dialog'])('closing or replacing the dialog during authorization cancels submission (%s)', async nextRequestId => {
  mockState.sendModal = {requestId: 'reviewed-dialog'};
  context = captureIdentityUpdateContext({...context, modalRequestId: 'reviewed-dialog'});
  getKeys.mockImplementation(async () => {
    mockState.sendModal.requestId = nextRequestId;
    return built.utxos.map(() => [KEY.toWIF()]);
  });
  await expect(submit()).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPersist).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});
