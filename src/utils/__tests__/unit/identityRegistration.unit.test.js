const mockAddress = 'R-wallet';
const mockState = {authentication: {activeAccount: {accountHash: 'account-a'}, sessionEpoch: 1}};
let mockJobs;
let mockTransactions;
let mockPersistenceError;
let mockBroadcastError;
let mockSigningStatus;
let mockEvents;
let mockQuote;
let mockSessionEpoch = 0;
const mockTipHash = 'c'.repeat(64);
const mockCommitTxid = 'a'.repeat(64);
const mockRevealTxid = 'b'.repeat(64);
const mockGetFunding = jest.fn();
const mockGetKey = jest.fn();
const mockLink = jest.fn();
const mockDispatch = jest.fn();
const mockPublishState = jest.fn();
const mockClearLifecycle = jest.fn();
const mockRefreshLifecycles = jest.fn();
const mockSetUserCoins = jest.fn();
const mockRandom = jest.fn();
const mockResolve = jest.fn();
const mockSend = jest.fn();
const mockSendRegistration = jest.fn();
const mockRaw = jest.fn();
const mockGetInfo = jest.fn();
const mockGetBlock = jest.fn();
const mockGetTxOut = jest.fn();
const mockGetCurrency = jest.fn();
const mockGetIdentity = jest.fn();
const mockBuildCommitment = jest.fn();
const mockBuildRegistration = jest.fn();
const mockSign = jest.fn();
const mockValidate = jest.fn();
const mockRemoveJob = jest.fn();
const mockVerifyFunding = jest.fn();
const mockClient = {
  resolveIdentityRegistration: mockResolve,
  createNameReservationTransaction: mockBuildCommitment,
  createIdentityRegistrationTransaction: mockBuildRegistration,
  signIdentityRegistrationTransaction: mockSign,
  verifyIdentityRegistrationFunding: (...args) => mockVerifyFunding(...args),
  sendIdentityRegistrationTransaction: (...args) => mockSendRegistration(...args),
  validateIdentityRegistrationTransaction: (...args) => mockValidate(...args),
  interface: {
    getRawTransaction: mockRaw, sendRawTransaction: mockSend,
    getInfo: mockGetInfo, getBlock: mockGetBlock, getTxOut: mockGetTxOut, getCurrency: mockGetCurrency,
    getIdentity: mockGetIdentity,
  },
};

jest.mock('@bitgo/utxo-lib', () => ({
  ECPair: {fromWIF: () => ({getAddress: () => mockAddress})},
  Transaction: {fromHex: hex => ({
    getId: () => hex === 'commit-signed' ? mockCommitTxid : mockRevealTxid,
    toHex: () => hex,
    outs: [{value: 1, script: Buffer.from('funding-script')}],
  })},
  networks: {verus: {}},
}));
// Canonical output ownership is exercised with the real SDK in its integration
// suite; these orchestration fixtures use symbolic addresses and transactions.
jest.mock('../../identityManagement/identityFunds', () => ({identityOutputAmounts: jest.fn()}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState, dispatch: (...args) => mockDispatch(...args)}}));
jest.mock('../../constants/constants', () => ({I_ADDRESS_VERSION: 102}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: (...args) => mockGetKey(...args)}));
jest.mock('../../crypto/randomBytes', () => ({randomBytes: (...args) => mockRandom(...args)}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/verusid', () => ({linkVerusId: (...args) => mockLink(...args)}));
jest.mock('../../../actions/actionCreators', () => ({setUserCoins: (...args) => mockSetUserCoins(...args)}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  clearChainLifecycle: (...args) => mockClearLifecycle(...args),
  refreshActiveChainLifecycles: (...args) => mockRefreshLifecycles(...args),
}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {getVerusIdInterface: () => mockClient},
}));
jest.mock('../../api/channels/verusid/requests/registerIdentity', () => ({
  getIdentityRegistrationFunding: (...args) => mockGetFunding(...args),
  registrationRpcResult: (response, label) => {
    if (response.error) throw Object.assign(new Error(response.error.message), {code: response.error.code});
    if (!Object.prototype.hasOwnProperty.call(response, 'result')) throw new Error(label);
    return response.result;
  },
}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/registration', () => ({
  publishRegistrationState: (...args) => mockPublishState(...args),
  removeRegistrationJob: (...args) => mockRemoveJob(...args),
  getRegistrationJobs: async () => JSON.parse(JSON.stringify(mockJobs)),
  getRegistrationJob: async id => JSON.parse(JSON.stringify(mockJobs[id])),
  saveRegistrationJob: async job => {
    if (mockPersistenceError) throw new Error('storage unavailable');
    const saved = {...job, revision: 1};
    mockJobs[job.id] = JSON.parse(JSON.stringify(saved));
    mockEvents.push(`saved:${saved.status}`);
    return JSON.parse(JSON.stringify(saved));
  },
  updateRegistrationJob: async (id, updater) => {
    if (mockPersistenceError) throw new Error('storage unavailable');
    const saved = {...updater(mockJobs[id]), revision: mockJobs[id].revision + 1};
    mockJobs[id] = JSON.parse(JSON.stringify(saved));
    mockEvents.push(`saved:${saved.status}`);
    return JSON.parse(JSON.stringify(saved));
  },
}));

const {
  createRegistrationContext, normalizeRegistrationRequest, prepareCommitment, approveCommitment,
  resolveRegistration,
  prepareRegistration, approveRegistration, reconcileRegistration,
  retryBroadcast, getRegistrationReview, refreshRegistrationReview,
  linkRegisteredIdentity, findExistingRegistration, deleteRegistration,
} = require('../../identityRegistration');
const {formatRegistrationAmount, validateRegistrationQuote, registrationQuotesEqual} = require('../../identityRegistration/costs');
const {toIAddress} = require('verus-typescript-primitives');

const request = {
  systemId: 'system', chainTicker: 'VRSC', rootSystemName: 'VRSC',
  fundingAddress: mockAddress, signingAddress: mockAddress, keyChannel: 'vrpc', name: 'alice',
};
const prepared = stage => ({
  stage, quote: {...mockQuote},
  snapshot: {systemID: 'system', expiryHeight: 120},
  requiredSignatures: [{threshold: 1, requirements: [{threshold: 1, eligibleKeyIDs: [mockAddress]}]}],
  revealAuthorities: [],
  outputPlan: [{scriptHex: 'commit-script'}],
  txHex: `${stage}-unsigned`,
  ...(stage === 'registration' ? {commitment: {txid: mockCommitTxid, vout: 0}} : {}),
  prevouts: [
    ...(stage === 'registration' ? [{txid: mockCommitTxid, vout: 0, rawTransaction: 'commit-signed'}] : []),
    {txid: 'f'.repeat(64), vout: 0, rawTransaction: 'funding-raw'},
  ],
});
const build = async () => prepareCommitment({request, approvedCosts: mockQuote.totalOperationRequired}, createRegistrationContext());
const confirm = txid => mockTransactions.set(txid, {
  txid, hex: txid === mockCommitTxid ? 'commit-signed' : 'reveal-signed',
  confirmations: 1, blockhash: mockTipHash,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockState.authentication = {activeAccount: {accountHash: 'account-a', id: 'profile-a'}, sessionEpoch: ++mockSessionEpoch};
  mockState.channelStore_verusid = {watchedVerusIds: {}};
  mockState.coins = {activeCoinList: [{id: 'VRSC', users: ['profile-a']}]};
  mockJobs = {};
  mockTransactions = new Map();
  mockPersistenceError = false;
  mockBroadcastError = false;
  mockSigningStatus = 'complete';
  mockEvents = [];
  mockQuote = {
    branch: 'native', systemID: 'system', issuerID: 'system', parentID: 'system',
    feePricingCurrencyID: 'system', candidateHeight: 101,
    commitmentFee: '10000', registrationOffer: '10000000000', nativeFee: '10000000000',
    importFee: '0', transferFee: '0', referralPayments: [],
    totalRequired: {system: '10000000000'}, totalOperationRequired: {system: '10000010000'},
  };
  mockGetCurrency.mockResolvedValue({result: {currencyid: 'system', systemid: 'system', fullyqualifiedname: 'VRSC@'}});
  mockGetIdentity.mockResolvedValue({result: {identity: {
    identityaddress: 'i-payment', minimumsignatures: 1, primaryaddresses: [mockAddress], flags: 0,
  }}});
  mockGetFunding.mockResolvedValue([{txid: 'f'.repeat(64), vout: 0}]);
  mockGetKey.mockResolvedValue('private-key-must-never-be-persisted');
  mockLink.mockResolvedValue(undefined);
  mockPublishState.mockResolvedValue(undefined);
  mockSetUserCoins.mockImplementation(coins => ({type: 'set-user-coins', payload: {activeCoinsForUser: coins}}));
  mockRandom.mockImplementation(async length => Buffer.alloc(length, 9));
  mockResolve.mockImplementation(async () => ({
    policy: {resolvedName: {name: 'alice', parent: 'system', fullName: 'alice.VRSC@', identityID: 'i-alice'}},
    quote: {...mockQuote},
  }));
  mockBuildCommitment.mockImplementation(async args => ({
    reservation: {reservationHex: args.salt.toString('hex'), fullName: 'alice.VRSC@'},
    commitmentVout: 0, transaction: prepared('commitment'),
  }));
  mockBuildRegistration.mockImplementation(async () => prepared('registration'));
  mockValidate.mockImplementation(transaction => ({signingStatus: mockSigningStatus,
    txid: transaction.stage === 'commitment' ? mockCommitTxid : mockRevealTxid}));
  mockVerifyFunding.mockImplementation(() => true);
  mockSendRegistration.mockImplementation(async (_transaction, hex) => {
    const txid = hex === 'commit-signed' ? mockCommitTxid : mockRevealTxid;
    try {
      const response = await mockSend(hex);
      if (response?.error || response?.result !== txid) throw new Error('No matching broadcast response');
      return response;
    } catch (cause) {
      throw Object.assign(new Error('Broadcast outcome is unknown'), {code: 'BROADCAST_UNKNOWN', details: {txid, cause}});
    }
  });
  mockRemoveJob.mockImplementation(async (id, revision) => {
    expect(mockJobs[id].revision).toBe(revision);
    delete mockJobs[id];
    return {jobId: id};
  });
  mockSign.mockImplementation(({transaction}) => ({
    signingStatus: mockSigningStatus,
    hex: transaction.stage === 'commitment' ? 'commit-signed' : 'reveal-signed',
    txid: transaction.stage === 'commitment' ? mockCommitTxid : mockRevealTxid,
  }));
  mockRaw.mockImplementation(async txid => mockTransactions.has(txid)
    ? {result: mockTransactions.get(txid)} : {error: {code: -5, message: 'No such transaction'}});
  mockGetInfo.mockResolvedValue({result: {blocks: 100, longestchain: 100, chainid: 'system'}});
  mockGetBlock.mockResolvedValue({result: {hash: mockTipHash, height: 100, confirmations: 1, tx: [mockCommitTxid, mockRevealTxid]}});
  mockGetTxOut.mockResolvedValue({result: {
    bestblock: mockTipHash, confirmations: 1, scriptPubKey: {hex: 'commit-script'},
  }});
  mockSend.mockImplementation(async hex => {
    const txid = hex === 'commit-signed' ? mockCommitTxid : mockRevealTxid;
    const job = Object.values(mockJobs)[0];
    const stage = hex === 'commit-signed' ? 'commitment' : 'registration';
    expect(job[stage].signedHex).toBe(hex);
    expect(job[stage].txid).toBe(txid);
    mockEvents.push(`broadcast:${stage}`);
    mockTransactions.set(txid, {txid, hex, confirmations: 0});
    if (mockBroadcastError) throw new Error('connection lost after acceptance');
    return {result: txid};
  });
});

test('persists reservation before signing, and signed bytes before broadcast; review is redacted', async () => {
  const review = await build();
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(JSON.stringify(review)).not.toMatch(/reservationHex|saltHex|commit-script|prevouts|unsigned/);
  const result = await approveCommitment(review.jobId, review.approvalToken, createRegistrationContext());
  expect(result.status).toBe('commitment_broadcast');
  expect(mockEvents.indexOf('saved:commitment_signed')).toBeLessThan(mockEvents.indexOf('broadcast:commitment'));
  expect(JSON.stringify(mockJobs)).not.toContain('private-key-must-never-be-persisted');
  expect(mockGetKey.mock.calls[0][2].sessionScope.accountHash).toBe('account-a');
  expect(mockSendRegistration).toHaveBeenCalledWith(mockJobs[review.jobId].commitment.prepared, 'commit-signed', mockAddress);
});

test('a first payment writes its refreshed plan and signed receipt once before immediate broadcast', async () => {
  const review = await build();
  mockEvents = [];
  await approveCommitment(review.jobId, review.approvalToken, createRegistrationContext());
  expect(mockEvents).toEqual(['saved:commitment_signed', 'broadcast:commitment', 'saved:commitment_broadcast']);
  expect(mockValidate).toHaveBeenCalledTimes(1);
  expect(mockValidate).toHaveBeenCalledWith(mockJobs[review.jobId].commitment.prepared, 'commit-signed', mockAddress);
  expect(mockRaw).not.toHaveBeenCalled();
});

test('unchanged polls recheck live chain evidence without rewriting or revalidating identical signatures', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  await reconcileRegistration(review.jobId, context);
  mockEvents = [];
  mockValidate.mockClear();
  mockGetTxOut.mockClear();
  const revision = mockJobs[review.jobId].revision;
  await reconcileRegistration(review.jobId, context);
  await reconcileRegistration(review.jobId, context);
  expect(mockEvents).toEqual([]);
  expect(mockJobs[review.jobId].revision).toBe(revision);
  expect(mockValidate).not.toHaveBeenCalled();
  expect(mockGetTxOut).toHaveBeenCalledTimes(2);
});

test.each(['plan', 'signed bytes', 'funding address', 'session'])('cached signature verification is invalidated by changed %s', async change => {
  let context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  if (change === 'plan') mockJobs[review.jobId].commitment.prepared.txHex = 'changed';
  else if (change === 'signed bytes') mockJobs[review.jobId].commitment.signedHex = 'changed';
  else if (change === 'funding address') mockJobs[review.jobId].fundingAddress = 'R-other';
  else {
    mockState.authentication.sessionEpoch++;
    context = createRegistrationContext();
  }
  mockValidate.mockImplementationOnce(() => { throw new Error('invalid receipt'); });
  await expect(reconcileRegistration(review.jobId, context)).rejects.toThrow('invalid receipt');
  expect(mockValidate).toHaveBeenCalledTimes(2);
});

test('opening a prepared registration review does not rebuild, poll, or write it', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  mockResolve.mockClear(); mockBuildRegistration.mockClear(); mockRaw.mockClear(); mockEvents = [];
  expect(await prepareRegistration({jobId: review.jobId}, context)).toEqual(review);
  expect(mockResolve).not.toHaveBeenCalled();
  expect(mockBuildRegistration).not.toHaveBeenCalled();
  expect(mockRaw).not.toHaveBeenCalled();
  expect(mockEvents).toEqual([]);
});

test('cached reveal validation remains bound to its independently saved commitment', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  await approveRegistration(review.jobId, review.approvalToken, context);

  mockJobs[review.jobId].commitment.vout = 1;
  mockValidate.mockClear();
  mockSend.mockClear();
  await expect(reconcileRegistration(review.jobId, context)).rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
  expect(mockValidate).toHaveBeenCalledWith(mockJobs[review.jobId].registration.prepared, 'reveal-signed', mockAddress);
  expect(mockSend).not.toHaveBeenCalled();
});

test('preparing from the create screen resolves one quote without requiring a separate preliminary review', async () => {
  const review = await prepareCommitment({request}, createRegistrationContext());
  expect(review.quote).toEqual(mockQuote);
  expect(mockResolve).toHaveBeenCalledTimes(1);
  expect(mockBuildCommitment.mock.calls[0][0].approvedCosts).toEqual(mockQuote.totalOperationRequired);
  expect(mockSign).not.toHaveBeenCalled();
});

const calculatedFeeError = (quote, stage = 'commitment') => Object.assign(new Error('Calculated fee exceeds estimate'), {
  code: 'COST_LIMIT_EXCEEDED',
  details: {quote, requiredCosts: stage === 'commitment' ? quote.totalOperationRequired : quote.totalRequired},
});

const higherCommitmentQuote = () => ({
  ...mockQuote, commitmentFee: '20000', totalOperationRequired: {system: '10000020000'},
});

test('prepares the calculated commitment fee for review without signing', async () => {
  const quote = higherCommitmentQuote();
  mockBuildCommitment.mockRejectedValueOnce(calculatedFeeError(quote))
    .mockImplementationOnce(async args => ({
      reservation: {reservationHex: args.salt.toString('hex'), fullName: 'alice.VRSC@'},
      commitmentVout: 0, transaction: {...prepared('commitment'), quote},
    }));

  const review = await prepareCommitment({request}, createRegistrationContext());

  expect(review.quote).toEqual(quote);
  expect(mockBuildCommitment.mock.calls.map(([args]) => args.approvedCosts))
    .toEqual([mockQuote.totalOperationRequired, quote.totalOperationRequired]);
  expect(mockBuildCommitment.mock.calls[1][0].salt).toEqual(mockBuildCommitment.mock.calls[0][0].salt);
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('preserves an explicit commitment cost limit and reports the calculated quote', async () => {
  const quote = higherCommitmentQuote();
  mockBuildCommitment.mockRejectedValueOnce(calculatedFeeError(quote));

  await expect(build()).rejects.toMatchObject({
    code: 'COST_LIMIT_EXCEEDED', registrationEstimate: {quote},
  });

  expect(mockBuildCommitment).toHaveBeenCalledTimes(1);
  expect(mockJobs).toEqual({});
  expect(mockGetKey).not.toHaveBeenCalled();
});

test('a calculated fee increase after review requires approval again before signing', async () => {
  const review = await build();
  const quote = higherCommitmentQuote();
  mockBuildCommitment.mockRejectedValueOnce(calculatedFeeError(quote))
    .mockImplementationOnce(async args => ({
      reservation: {reservationHex: args.salt.toString('hex'), fullName: 'alice.VRSC@'},
      commitmentVout: 0, transaction: {...prepared('commitment'), quote},
    }));

  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext()))
    .rejects.toMatchObject({code: 'REVIEW_CHANGED'});

  expect(mockJobs[review.jobId].commitment.prepared.quote).toEqual(quote);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('prepares a calculated reveal fee for review without sending it', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  const quote = {...mockQuote, nativeFee: '10000010000',
    totalRequired: {system: '10000010000'}, totalOperationRequired: {system: '10000020000'}};
  mockBuildRegistration.mockRejectedValueOnce(calculatedFeeError(quote, 'registration'))
    .mockResolvedValueOnce({...prepared('registration'), quote});
  mockGetKey.mockClear();
  mockSign.mockClear();
  mockSend.mockClear();

  review = await prepareRegistration({jobId: review.jobId}, context);

  expect(review.quote).toEqual(quote);
  expect(mockBuildRegistration.mock.calls.map(([args]) => args.approvedCosts))
    .toEqual([mockQuote.totalRequired, quote.totalRequired]);
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('preparation failures carry only the public estimate needed to choose another funding source', async () => {
  mockBuildCommitment.mockRejectedValueOnce(Object.assign(new Error('not enough'), {code: 'INSUFFICIENT_FUNDS'}));
  await expect(prepareCommitment({request}, createRegistrationContext())).rejects.toMatchObject({
    code: 'INSUFFICIENT_FUNDS', registrationEstimate: {quote: mockQuote, currencyNames: {}, identityNames: expect.any(Object)},
  });
  expect(mockJobs).toEqual({});
});

test('foreground continuation waits for a cancelled passive check instead of failing busy', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  let release;
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  mockRaw.mockImplementationOnce(() => { started(); return new Promise(resolve => { release = resolve; }); });
  const controller = new AbortController();
  const passive = reconcileRegistration(review.jobId, {...context, registrationBackground: true, signal: controller.signal});
  const rejection = expect(passive).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  await waiting;
  const continuation = prepareRegistration({jobId: review.jobId}, context);
  controller.abort();
  release({result: mockTransactions.get(mockCommitTxid)});
  await rejection;
  expect((await continuation).status).toBe('registration_prepared');
});

test('separates commitment, registration and explicit linking with immediate wallet refresh', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  await expect(prepareRegistration({jobId: review.jobId}, context)).rejects.toThrow(/Wait for/);
  confirm(mockCommitTxid);
  review = await reconcileRegistration(review.jobId, context);
  expect(review.status).toBe('commitment_confirmed');
  review = await prepareRegistration({jobId: review.jobId}, context);
  expect(review.status).toBe('registration_prepared');
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockSend).toHaveBeenCalledTimes(1);
  review = await approveRegistration(review.jobId, review.approvalToken, context);
  expect(review.status).toBe('registration_broadcast');
  expect(mockLink).not.toHaveBeenCalled();
  confirm(mockRevealTxid);
  review = await reconcileRegistration(review.jobId, context);
  expect(review).toMatchObject({status: 'registered', linked: false});
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
  await reconcileRegistration(review.jobId, context);
  expect(mockLink).not.toHaveBeenCalled();
  review = await linkRegisteredIdentity(review.jobId, context);
  expect(review).toMatchObject({status: 'complete', linked: true});
  expect(mockLink).toHaveBeenCalledWith('i-alice', 'alice.VRSC@', 'VRSC', context);
  expect(mockPublishState).toHaveBeenCalledWith(context);
  expect(mockClearLifecycle).toHaveBeenCalledWith('VRSC', undefined, context.sessionScope);
  expect(mockSetUserCoins).toHaveBeenCalledWith(mockState.coins.activeCoinList, 'profile-a');
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({type: 'set-user-coins', meta: context.sessionScope}));
  expect(mockRefreshLifecycles).toHaveBeenCalledWith(mockState.coins.activeCoinList);
  await linkRegisteredIdentity(review.jobId, context);
  expect(mockLink).toHaveBeenCalledTimes(1);
  expect(mockPublishState).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(2);
  expect(mockSend).toHaveBeenCalledTimes(2);
});

test('accepted send followed by timeout reconciles and never signs or sends a second transaction', async () => {
  const context = createRegistrationContext();
  const review = await build();
  mockBroadcastError = true;
  expect((await approveCommitment(review.jobId, review.approvalToken, context)).status).toBe('commitment_broadcast');
  await retryBroadcast(review.jobId, context);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('missing broadcast is retried with identical saved bytes and no signing', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  mockTransactions.clear();
  await retryBroadcast(review.jobId, context);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend.mock.calls.map(call => call[0])).toEqual(['commit-signed', 'commit-signed']);
});

test.each(['commitment', 'registration'])('independent funding verification gates signing and sending %s', async stage => {
  const context = createRegistrationContext();
  let review = await build();
  if (stage === 'registration') {
    await approveCommitment(review.jobId, review.approvalToken, context);
    confirm(mockCommitTxid);
    await reconcileRegistration(review.jobId, context);
    review = await prepareRegistration({jobId: review.jobId}, context);
  }
  mockGetKey.mockClear();
  mockSign.mockClear();
  mockSend.mockClear();
  mockVerifyFunding.mockImplementation(() => {
    throw Object.assign(new Error('Incorrect change amount'), {code: 'REGISTRATION_FUNDING_MISMATCH'});
  });
  const approve = stage === 'commitment' ? approveCommitment : approveRegistration;
  await expect(approve(review.jobId, review.approvalToken, context))
    .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
  expect(mockVerifyFunding).toHaveBeenCalledWith(mockJobs[review.jobId][stage].prepared, `${stage}-unsigned`, mockAddress);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('independent funding verification rejects a changed signed result before the first send', async () => {
  const review = await build();
  mockVerifyFunding.mockImplementation((_transaction, candidateHex) => {
    if (candidateHex === 'commit-signed') {
      throw Object.assign(new Error('Signed transaction lost reserve change'), {code: 'REGISTRATION_FUNDING_MISMATCH'});
    }
    return true;
  });
  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext()))
    .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockValidate).toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['commitment', 'registration'])('every %s retry repeats independent funding verification despite cached SDK validation', async stage => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  if (stage === 'registration') {
    confirm(mockCommitTxid);
    await reconcileRegistration(review.jobId, context);
    review = await prepareRegistration({jobId: review.jobId}, context);
    await approveRegistration(review.jobId, review.approvalToken, context);
    mockTransactions.delete(mockRevealTxid);
  } else mockTransactions.clear();
  mockSend.mockClear();
  mockSign.mockClear();
  mockValidate.mockClear();
  mockVerifyFunding.mockClear();
  await retryBroadcast(review.jobId, context);
  const saved = mockJobs[review.jobId][stage];
  expect(mockVerifyFunding).toHaveBeenCalledWith(saved.prepared, saved.signedHex, mockAddress);
  expect(mockSendRegistration).toHaveBeenLastCalledWith(saved.prepared, saved.signedHex, mockAddress);
  expect(mockSend).toHaveBeenCalledTimes(1);
  mockTransactions.delete(stage === 'commitment' ? mockCommitTxid : mockRevealTxid);
  mockSend.mockClear();
  mockVerifyFunding.mockImplementation(() => {
    throw Object.assign(new Error('Absurd fee'), {code: 'REGISTRATION_FUNDING_MISMATCH'});
  });
  await expect(retryBroadcast(review.jobId, context))
    .rejects.toMatchObject({code: 'REGISTRATION_FUNDING_MISMATCH'});
  // A safety failure must escape, never be downgraded to uncertain broadcast.
  expect(mockJobs[review.jobId].status).not.toBe(`${stage}_broadcast_unknown`);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockValidate).not.toHaveBeenCalled();
});

test('a storage failure after approval cannot send a transaction', async () => {
  const review = await build();
  mockSign.mockImplementationOnce(() => {
    mockPersistenceError = true;
    return {hex: 'commit-signed', txid: mockCommitTxid, signingStatus: 'complete'};
  });
  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext())).rejects.toThrow('storage unavailable');
  expect(mockSend).not.toHaveBeenCalled();
});

test('a session change after fresh signature verification stops persistence and first broadcast', async () => {
  const review = await build();
  mockValidate.mockImplementationOnce(transaction => {
    mockState.authentication.sessionEpoch++;
    return {signingStatus: 'complete', txid: transaction.stage === 'commitment' ? mockCommitTxid : mockRevealTxid};
  });
  const context = createRegistrationContext();
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockJobs[review.jobId].commitment.signedHex).toBeUndefined();
  expect(mockSend).not.toHaveBeenCalled();
});

test('account switch during authentication stops signing and broadcast', async () => {
  const review = await build();
  const context = createRegistrationContext();
  mockGetKey.mockImplementationOnce(async () => {
    mockState.authentication.sessionEpoch++;
    return 'secret';
  });
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('account switch during construction stops durable write and does not expose the reservation', async () => {
  mockGetFunding.mockImplementationOnce(async () => {
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    return [];
  });
  await expect(build()).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockJobs).toEqual({});
});

test('partial signatures are saved and resumed against their original prepared transaction without broadcasting', async () => {
  const review = await build();
  const salt = mockJobs[review.jobId].saltHex;
  mockSigningStatus = 'partial';
  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext())).rejects.toThrow(/more signatures/);
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockJobs[review.jobId].commitment.signedHex).toBeUndefined();
  expect(mockJobs[review.jobId].commitment.partial).toEqual({
    prepared: mockJobs[review.jobId].commitment.prepared,
    hex: 'commit-signed', txid: mockCommitTxid,
  });
  mockSigningStatus = 'complete';
  await approveCommitment(review.jobId, review.approvalToken, createRegistrationContext());
  expect(mockSign).toHaveBeenLastCalledWith(expect.objectContaining({partialTransactions: ['commit-signed']}));
  expect(mockJobs[review.jobId].saltHex).toBe(salt);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test.each(['timeout', 'RPC error', 'missing response', 'mismatched txid'])(
  '%s retains the original prepared approval and signed outpoint for an identical-byte retry', async outcome => {
    const context = createRegistrationContext();
    const review = await build();
    const reservation = JSON.parse(JSON.stringify(mockJobs[review.jobId].reservation));
    mockSend.mockImplementationOnce(async () => {
      if (outcome === 'timeout') throw new Error('timeout');
      if (outcome === 'RPC error') return {error: {code: -25, message: 'Rejected'}};
      if (outcome === 'missing response') return undefined;
      return {result: 'd'.repeat(64)};
    });
    const result = await approveCommitment(review.jobId, review.approvalToken, context);
    expect(result).toMatchObject({status: 'commitment_signed', lastError: expect.stringContaining('could not be confirmed')});
    const saved = JSON.parse(JSON.stringify(mockJobs[review.jobId]));
    expect(saved.reservation).toEqual(reservation);
    expect(saved.commitment).toMatchObject({signedHex: 'commit-signed', txid: mockCommitTxid,
      vout: 0, broadcastStatus: 'unknown'});
    await retryBroadcast(review.jobId, context);
    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(mockSendRegistration).toHaveBeenLastCalledWith(saved.commitment.prepared, saved.commitment.signedHex, saved.fundingAddress);
  },
);

test('SDK validation rejection before submission remains a definite error and preserves its signed receipt', async () => {
  const review = await build();
  mockSendRegistration.mockRejectedValueOnce(Object.assign(new Error('Invalid signature'), {code: 'INVALID_SIGNATURE'}));
  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext()))
    .rejects.toMatchObject({code: 'INVALID_SIGNATURE'});
  expect(mockJobs[review.jobId].commitment).toMatchObject({signedHex: 'commit-signed', txid: mockCommitTxid});
  expect(mockJobs[review.jobId].commitment.broadcastStatus).toBeUndefined();
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockRaw).not.toHaveBeenCalled();
});

test('retry rechecks unspent funding even when saved signature validation is cached', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  mockTransactions.clear();
  const saved = JSON.parse(JSON.stringify(mockJobs[review.jobId].commitment));
  mockGetTxOut.mockResolvedValueOnce({result: null});
  await expect(retryBroadcast(review.jobId, context)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockJobs[review.jobId].commitment.signedHex).toBe(saved.signedHex);
});

test('a retry cannot submit a saved registration on a newly configured wrong-chain endpoint', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  mockTransactions.clear();
  mockGetInfo.mockResolvedValue({result: {blocks: 100, longestchain: 100, chainid: 'another-chain'}});
  await expect(retryBroadcast(review.jobId, context)).rejects.toMatchObject({code: 'WRONG_REGISTRATION_SYSTEM'});
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('uncertain broadcast reconciles the locally computed txid instead of substituting error details', async () => {
  const review = await build();
  mockSendRegistration.mockRejectedValueOnce(Object.assign(new Error('Unknown send'), {
    code: 'BROADCAST_UNKNOWN', details: {txid: 'd'.repeat(64)},
  }));
  await approveCommitment(review.jobId, review.approvalToken, createRegistrationContext());
  expect(mockRaw).toHaveBeenCalledWith(mockCommitTxid, 1);
  expect(mockRaw).not.toHaveBeenCalledWith('d'.repeat(64), expect.anything());
  expect(mockJobs[review.jobId].commitment.txid).toBe(mockCommitTxid);
});

test('restricted namespaces without local authorization fail before salt persistence or payment', async () => {
  mockResolve.mockResolvedValueOnce({
    quote: mockQuote,
    policy: {requiredAuthorityID: 'issuer', requiredAuthority: {primaryaddresses: ['someone-else'], minimumsignatures: 1}},
  });
  await expect(build()).rejects.toMatchObject({code: 'EXTERNAL_AUTHORIZATION_REQUIRED'});
  expect(mockRandom).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('refreshed costs require renewed review, preserving the original salt', async () => {
  const review = await build();
  const salt = mockJobs[review.jobId].saltHex;
  mockQuote = {...mockQuote, registrationOffer: '20000000000', nativeFee: '20000000000', totalRequired: {system: '20000000000'}, totalOperationRequired: {system: '20000010000'}};
  await expect(approveCommitment(review.jobId, review.approvalToken, createRegistrationContext())).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  const refreshed = await getRegistrationReview(review.jobId, createRegistrationContext());
  expect(refreshed.quote.totalRequired.system).toBe('20000000000');
  expect(mockJobs[review.jobId].saltHex).toBe(salt);
});

test('same-price authorization changes are saved together and require approval before signing', async () => {
  const context = createRegistrationContext();
  const review = await build();
  const original = JSON.parse(JSON.stringify(mockJobs[review.jobId]));
  const authority = toIAddress('issuer.VRSC@', 'VRSC');
  mockGetIdentity.mockResolvedValue({result: {
    identity: {identityaddress: authority}, fullyqualifiedname: 'issuer.VRSC@',
  }});
  mockBuildCommitment.mockImplementation(async args => ({
    reservation: {...original.reservation, reservationHex: args.salt.toString('hex'), authorizationID: authority},
    commitmentVout: 1,
    transaction: {...prepared('commitment'), txHex: 'new-authorization-unsigned',
      revealAuthorities: [{identityID: authority, minimumSignatures: 1, primaryAddresses: [mockAddress]}]},
  }));
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
  const saved = mockJobs[review.jobId];
  expect(saved.reservation).toEqual({...original.reservation, authorizationID: authority});
  expect(saved.saltHex).toBe(original.saltHex);
  expect(saved.commitment.vout).toBe(1);
  expect(saved.commitment.prepared.txHex).toBe('new-authorization-unsigned');
  const updated = await getRegistrationReview(review.jobId, context);
  expect(updated.quote).toEqual(review.quote);
  expect(updated.registrationAuthority).toBe(authority);
  expect(updated.identityNames[authority]).toBe('issuer.VRSC@');
  expect(updated.approvalToken).not.toBe(review.approvalToken);
  mockGetKey.mockClear();
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockGetKey).not.toHaveBeenCalled();
  expect((await approveCommitment(updated.jobId, updated.approvalToken, context)).status).toBe('commitment_broadcast');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test.each(['commitment', 'registration'])('changed %s transaction bytes require new approval even with identical costs', async stage => {
  const context = createRegistrationContext();
  let review = await build();
  if (stage === 'registration') {
    await approveCommitment(review.jobId, review.approvalToken, context);
    confirm(mockCommitTxid);
    review = await prepareRegistration({jobId: review.jobId}, context);
    mockBuildRegistration.mockResolvedValue({...prepared(stage), txHex: 'changed-registration-unsigned'});
  } else {
    const original = mockJobs[review.jobId];
    mockBuildCommitment.mockResolvedValue({reservation: original.reservation,
      commitmentVout: 0, transaction: {...prepared(stage), txHex: 'changed-commitment-unsigned'}});
  }
  mockSign.mockClear();
  mockSend.mockClear();
  const approve = stage === 'commitment' ? approveCommitment : approveRegistration;
  await expect(approve(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
  const updated = await getRegistrationReview(review.jobId, context);
  expect(updated.quote).toEqual(review.quote);
  expect((await approve(updated.jobId, updated.approvalToken, context)).status).toBe(`${stage}_broadcast`);
});

test.each(['reservationHex', 'controller', 'identityAddress', 'parentID', 'systemID'])('a rebuilt commitment cannot change its saved %s', async field => {
  const context = createRegistrationContext();
  const review = await build();
  const original = JSON.parse(JSON.stringify(mockJobs[review.jobId]));
  mockBuildCommitment.mockResolvedValue({
    reservation: {...original.reservation, [field]: 'changed'},
    commitmentVout: 0, transaction: prepared('commitment'),
  });
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toThrow('Saved name reservation changed.');
  expect(mockJobs[review.jobId]).toEqual(original);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('uncertain RPC failures do not authorize a retry or change confirmed state', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  mockRaw.mockResolvedValueOnce({error: {code: -28, message: 'Index loading'}});
  await expect(retryBroadcast(review.jobId, context)).rejects.toThrow('Index loading');
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a reorg removes commitment readiness', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  expect((await reconcileRegistration(review.jobId, context)).status).toBe('commitment_confirmed');
  mockTransactions.set(mockCommitTxid, {txid: mockCommitTxid, hex: 'commit-signed', confirmations: 0});
  expect((await reconcileRegistration(review.jobId, context)).status).toBe('commitment_broadcast');
});

test('quote arithmetic preserves large atomic values and does not count native fees twice', () => {
  expect(formatRegistrationAmount('9223372036854775807')).toBe('92233720368.54775807');
  expect(formatRegistrationAmount('10000')).toBe('0.0001');
  expect(validateRegistrationQuote(mockQuote)).toBe(mockQuote);
  expect(registrationQuotesEqual(mockQuote, {...mockQuote, candidateHeight: 999})).toBe(true);
  expect(() => validateRegistrationQuote({...mockQuote, totalOperationRequired: {system: '20000010000'}})).toThrow(/Inconsistent/);
  expect(() => formatRegistrationAmount(0.0001)).toThrow(/integer strings/);
  expect(() => formatRegistrationAmount('9223372036854775808')).toThrow(/integer strings/);
});

test('the approval token binds costs shown on screen, even when another review changed storage', async () => {
  const context = createRegistrationContext();
  const review = await build();
  mockQuote = {...mockQuote, registrationOffer: '20000000000', nativeFee: '20000000000', totalRequired: {system: '20000000000'}, totalOperationRequired: {system: '20000010000'}};
  await refreshRegistrationReview(review.jobId, context);
  await expect(approveCommitment(review.jobId, review.approvalToken, context)).rejects.toMatchObject({code: 'REVIEW_CHANGED'});
  expect(mockGetKey).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
});

test('confirmation changes do not invalidate an unchanged review approval token', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  const token = review.approvalToken;
  await reconcileRegistration(review.jobId, context);
  expect((await getRegistrationReview(review.jobId, context)).approvalToken).toBe(token);
  expect((await approveRegistration(review.jobId, token, context)).status).toBe('registration_broadcast');
});

test('a transaction in an orphan block cannot complete registration or link an identity', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  await approveRegistration(review.jobId, review.approvalToken, context);
  confirm(mockRevealTxid);
  mockGetBlock.mockImplementation(async key => ({result: {
    hash: key === mockTipHash ? mockTipHash : 'd'.repeat(64),
    height: 100, confirmations: 1, tx: [mockRevealTxid],
  }}));
  expect((await reconcileRegistration(review.jobId, context)).status).toBe('registration_broadcast');
  expect(mockLink).not.toHaveBeenCalled();
});

test('block membership is required before completing registration', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  await approveRegistration(review.jobId, review.approvalToken, context);
  confirm(mockRevealTxid);
  mockGetBlock.mockResolvedValue({result: {hash: mockTipHash, height: 100, confirmations: 1, tx: []}});
  expect((await reconcileRegistration(review.jobId, context)).status).toBe('registration_broadcast');
  expect(mockLink).not.toHaveBeenCalled();
});

test('expired commitment is rebuilt for review with the same salt, conflicting funding, and preserved receipt', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  const salt = mockJobs[review.jobId].saltHex;
  mockTransactions.clear();
  mockGetInfo.mockResolvedValue({result: {blocks: 125, longestchain: 125, chainid: 'system'}});
  mockGetBlock.mockResolvedValue({result: {hash: mockTipHash, height: 125, confirmations: 1, tx: []}});
  review = await reconcileRegistration(review.jobId, context);
  expect(review.status).toBe('commitment_expired');
  mockBuildCommitment.mockClear();
  review = await refreshRegistrationReview(review.jobId, context);
  expect(mockBuildCommitment).toHaveBeenCalledTimes(1);
  expect(review.status).toBe('commitment_prepared');
  expect(review.commitmentTxid).toBeUndefined();
  expect(mockJobs[review.jobId].saltHex).toBe(salt);
  expect(mockJobs[review.jobId].previousCommitments[0].txid).toBe(mockCommitTxid);
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockJobs[review.jobId].replacementFunding).toEqual([{txid: 'f'.repeat(64), vout: 0}]);
});

test('expired commitment cannot be replaced if none of its original funding remains unspent', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  mockTransactions.clear();
  mockGetInfo.mockResolvedValue({result: {blocks: 125, longestchain: 125, chainid: 'system'}});
  mockGetBlock.mockResolvedValue({result: {hash: mockTipHash, height: 125, confirmations: 1, tx: []}});
  await reconcileRegistration(review.jobId, context);
  mockGetFunding.mockResolvedValue([{txid: 'e'.repeat(64), vout: 0}]);
  await expect(refreshRegistrationReview(review.jobId, context)).rejects.toThrow(/funding was spent/);
  expect(mockJobs[review.jobId].commitment.signedHex).toBe('commit-signed');
  expect(mockSend).toHaveBeenCalledTimes(1);
});

test('a stale indexed orphan reveal still expires and can be reviewed again', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  await approveRegistration(review.jobId, review.approvalToken, context);
  mockTransactions.set(mockRevealTxid, {txid: mockRevealTxid, hex: 'reveal-signed', confirmations: -1, blockhash: 'e'.repeat(64)});
  mockGetInfo.mockResolvedValue({result: {blocks: 125, longestchain: 125, chainid: 'system'}});
  mockGetBlock.mockImplementation(async key => ({result: {
    hash: mockTipHash, height: key === '125' ? 125 : 100, confirmations: key === '125' ? 1 : 26,
    tx: [mockCommitTxid],
  }}));
  mockGetTxOut.mockResolvedValue({result: {bestblock: mockTipHash, confirmations: 26, scriptPubKey: {hex: 'commit-script'}}});
  expect((await reconcileRegistration(review.jobId, context)).status).toBe('registration_expired');
});

test('locally controlled restricted authority is supported before commitment payment', async () => {
  mockBuildCommitment.mockImplementationOnce(async args => ({
    reservation: {reservationHex: args.salt.toString('hex'), fullName: 'alice.VRSC@'},
    commitmentVout: 0,
    transaction: {...prepared('commitment'), revealAuthorities: [{identityID: 'issuer', minimumSignatures: 1, primaryAddresses: [mockAddress]}]},
  }));
  expect((await build()).status).toBe('commitment_prepared');
  expect(mockSend).not.toHaveBeenCalled();
});

test('invalid native RNG results cannot produce a saved commitment', async () => {
  mockRandom.mockResolvedValueOnce(Buffer.alloc(31, 9));
  await expect(build()).rejects.toThrow(/random generator/);
  expect(mockJobs).toEqual({});
});

test('a PBaaS bare leaf resolves and builds under the selected native namespace', async () => {
  mockGetCurrency.mockResolvedValue({result: {currencyid: 'system', systemid: 'system', fullyqualifiedname: 'vault.VRSC@'}});
  const review = await build();
  expect(mockResolve).toHaveBeenCalledWith(expect.objectContaining({name: 'alice', parent: 'system', parentName: 'vault.VRSC@'}));
  expect(mockBuildCommitment).toHaveBeenCalledWith(expect.objectContaining({name: 'alice', parent: 'system', parentName: 'vault.VRSC@'}));
  expect(mockJobs[review.jobId].request).toMatchObject({parent: 'system', parentName: 'vault.VRSC@'});
});

test('PBaaS namespace lookup cannot silently select another currency or network', async () => {
  mockGetCurrency.mockResolvedValue({result: {currencyid: 'another-chain', systemid: 'system', fullyqualifiedname: 'vault.VRSC@'}});
  await expect(build()).rejects.toMatchObject({code: 'WRONG_REGISTRATION_SYSTEM'});
  expect(mockBuildCommitment).not.toHaveBeenCalled();
  expect(mockJobs).toEqual({});
});

test('fully qualified user input and an explicit namespace are never silently reparented', async () => {
  const context = createRegistrationContext();
  expect(await normalizeRegistrationRequest({...request, name: 'alice.community@'}, context)).toEqual({...request, name: 'alice.community@'});
  expect(await normalizeRegistrationRequest({...request, parent: 'community', parentName: 'community.VRSC@'}, context)).toEqual({...request, parent: 'community', parentName: 'community.VRSC@'});
  expect(mockGetCurrency).not.toHaveBeenCalled();
});

test('public review includes the committed referral and verified currency display names', async () => {
  mockResolve.mockResolvedValue({
    quote: mockQuote,
    policy: {
      resolvedName: {name: 'alice', parent: 'system', fullName: 'alice.VRSC@', identityID: 'i-alice'},
      nativeDefinition: {currencyid: 'system', name: 'VRSC', fullyqualifiedname: 'VRSC@'},
      parentDefinition: {currencyid: 'system', name: 'VRSC', fullyqualifiedname: 'VRSC@'},
    },
  });
  const referralID = toIAddress('referrer', 'VRSC');
  const review = await prepareCommitment({request: {...request, referralID}, approvedCosts: mockQuote.totalOperationRequired}, createRegistrationContext());
  expect(review.referralID).toBe(referralID);
  expect(review.currencyNames).toEqual({system: 'VRSC@'});
  expect(JSON.stringify(review)).not.toMatch(/saltHex|reservationHex/);
});

test('payment identity ownership is rechecked after review and before any signature', async () => {
  const context = createRegistrationContext();
  const review = await prepareCommitment({
    request: {...request, fundingAddress: 'i-payment', signingAddress: mockAddress, fundingName: 't1@'},
    approvedCosts: mockQuote.totalOperationRequired,
  }, context);
  expect(review).toMatchObject({fundingAddress: 'i-payment', signingAddress: mockAddress, fundingName: 't1@'});
  expect(mockBuildCommitment).toHaveBeenCalledWith(expect.objectContaining({
    controller: mockAddress, changeAddress: 'i-payment',
  }));
  expect(review.identity.primaryaddresses).toEqual([mockAddress]);
  expect(mockGetFunding).toHaveBeenCalledWith('system', 'i-payment');

  mockGetIdentity.mockResolvedValue({result: {identity: {
    identityaddress: 'i-payment', minimumsignatures: 1, primaryaddresses: ['R-new-owner'], flags: 0,
  }}});
  await expect(approveCommitment(review.jobId, review.approvalToken, context))
    .rejects.toMatchObject({code: 'FUNDING_AUTHORIZATION_REQUIRED'});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('insufficient funding identifies the selected source and keeps approval separate', async () => {
  mockBuildCommitment.mockRejectedValueOnce(Object.assign(new Error('Approved funding must cover both the commitment and registration.'), {
    code: 'INSUFFICIENT_FUNDS',
  }));
  await expect(build()).rejects.toThrow(/selected payment source \(R-wallet\).*both steps/);
  expect(mockJobs).toEqual({});
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test.each(['referrer@', 'referrer', 'referrer.VRSC@'])('friendly identity choice %s resolves to a bound address before constructing a commitment', async referralName => {
  const referrer = toIAddress('referrer', 'VRSC');
  mockGetIdentity.mockResolvedValue({result: {
    fullyqualifiedname: 'referrer.VRSC@', identity: {identityaddress: referrer, flags: 0},
  }});
  const review = await prepareCommitment({request: {...request, referralID: referralName},
    approvedCosts: mockQuote.totalOperationRequired}, createRegistrationContext());
  expect(mockResolve).toHaveBeenCalledWith(expect.objectContaining({referralID: referrer}));
  expect(mockBuildCommitment).toHaveBeenCalledWith(expect.objectContaining({referralID: referrer}));
  expect(review.identityNames[referrer]).toBe('referrer.VRSC@');
  expect(review.referralID).toBe(referrer);
});

test('a friendly name lookup cannot substitute another identity', async () => {
  mockGetIdentity.mockResolvedValue({result: {
    fullyqualifiedname: 'mallory.VRSC@', identity: {identityaddress: toIAddress('mallory', 'VRSC'), flags: 0},
  }});
  await expect(prepareCommitment({request: {...request, recoveryAuthority: 'alice@'},
    approvedCosts: mockQuote.totalOperationRequired}, createRegistrationContext())).rejects.toThrow(/requested identifier/);
  expect(mockBuildCommitment).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('resolved reviews include names for payment recipients and authorities without exposing unrelated linked IDs', async () => {
  const referrer = toIAddress('referrer', 'VRSC');
  const authority = toIAddress('recovery', 'VRSC');
  const unrelated = toIAddress('unrelated', 'VRSC');
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {[referrer]: 'referrer@', [unrelated]: 'unrelated@'}};
  mockQuote.referralPayments = [{currencyID: 'system', recipient: referrer, amount: '1'}];
  mockGetIdentity.mockResolvedValue({result: {
    fullyqualifiedname: 'recovery.VRSC@', identity: {identityaddress: authority, flags: 0},
  }});
  const resolved = await resolveRegistration({...request, recoveryAuthority: authority,
    revocationAuthority: authority, referralID: referrer}, createRegistrationContext());
  expect(resolved.identityNames).toEqual({
    'i-alice': 'alice.VRSC@', [referrer]: 'referrer@', [authority]: 'recovery.VRSC@',
  });
  expect(mockGetIdentity).toHaveBeenCalledTimes(1);
  expect(mockGetIdentity).toHaveBeenCalledWith(authority);
});

test('saved registrations retry unavailable payment-name lookups without changing approved costs or rebuilding transactions', async () => {
  const context = createRegistrationContext();
  const recipient = toIAddress('recipient', 'VRSC');
  mockQuote.referralPayments = [{currencyID: 'system', recipient, amount: '1'}];
  mockQuote.nativeFee = '9999999999';
  mockGetIdentity.mockRejectedValue(new Error('Name lookup temporarily unavailable'));
  const review = await build();
  const saved = mockJobs[review.jobId];
  expect(saved.identityNames[recipient]).toBeUndefined();
  const beforeLookup = JSON.stringify(saved);
  mockGetIdentity.mockResolvedValue({result: {
    fullyqualifiedname: 'recipient.VRSC@', identity: {identityaddress: recipient},
  }});
  const restored = await getRegistrationReview(review.jobId, context);
  expect(restored.identityNames[recipient]).toBe('recipient.VRSC@');
  expect(restored.approvalToken).toBe(review.approvalToken);
  expect(JSON.stringify(saved)).toBe(beforeLookup);
  expect(mockBuildCommitment).toHaveBeenCalledTimes(1);
  expect(mockBuildRegistration).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});

test('failed or mismatched optional name lookups retain address fallback and do not block registration', async () => {
  const referralID = toIAddress('referrer', 'VRSC');
  mockGetIdentity.mockResolvedValue({result: {
    fullyqualifiedname: 'mallory.VRSC@', identity: {identityaddress: referralID},
  }});
  const context = createRegistrationContext();
  const review = await prepareCommitment({request: {...request, referralID},
    approvedCosts: mockQuote.totalOperationRequired}, context);
  expect(review.identityNames[referralID]).toBeUndefined();
  mockGetIdentity.mockRejectedValue(new Error('name lookup unavailable'));
  const restored = await getRegistrationReview(review.jobId, context);
  expect(restored.identityNames[referralID]).toBeUndefined();
  expect(restored.approvalToken).toBe(review.approvalToken);
  expect((await approveCommitment(review.jobId, restored.approvalToken, context)).status).toBe('commitment_broadcast');
});

test('changing accounts during an optional name lookup never publishes the previous account review', async () => {
  const context = createRegistrationContext();
  const review = await build();
  mockJobs[review.jobId].request.referralID = toIAddress('referrer', 'VRSC');
  mockGetIdentity.mockImplementationOnce(async () => {
    mockState.authentication.activeAccount.accountHash = 'account-b';
    throw new Error('lookup cancelled');
  });
  await expect(getRegistrationReview(review.jobId, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockSend).not.toHaveBeenCalled();
});

const registeredReview = async context => {
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  await approveRegistration(review.jobId, review.approvalToken, context);
  confirm(mockRevealTxid);
  return reconcileRegistration(review.jobId, context);
};

test('an unpaid draft can be deleted without chain calls', async () => {
  const context = createRegistrationContext();
  const review = await build();
  expect(review.deletionKind).toBe('draft');
  expect(await deleteRegistration(review.jobId, 'draft', context)).toEqual({jobId: review.jobId});
  expect(mockJobs).toEqual({});
  expect(mockRaw).not.toHaveBeenCalled();
  expect(mockLink).not.toHaveBeenCalled();
});

test('a paid commitment requires the matching loss-warning classification before deletion', async () => {
  const context = createRegistrationContext();
  const review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  await expect(deleteRegistration(review.jobId, 'draft', context)).rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
  expect(mockRemoveJob).not.toHaveBeenCalled();
  await deleteRegistration(review.jobId, 'commitment', context);
  expect(mockJobs).toEqual({});
});

test('an unsigned registration after a paid commitment remains deletable but a signed reveal does not', async () => {
  const context = createRegistrationContext();
  let review = await build();
  await approveCommitment(review.jobId, review.approvalToken, context);
  confirm(mockCommitTxid);
  review = await prepareRegistration({jobId: review.jobId}, context);
  expect(review.deletionKind).toBe('commitment');
  review = await approveRegistration(review.jobId, review.approvalToken, context);
  expect(review.deletionKind).toBeNull();
  await expect(deleteRegistration(review.jobId, 'commitment', context)).rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
  expect(mockRemoveJob).not.toHaveBeenCalled();
});

test('deleting a completed receipt verifies confirmation and leaves the linked identity intact', async () => {
  const context = createRegistrationContext();
  let review = await registeredReview(context);
  review = await linkRegisteredIdentity(review.jobId, context);
  mockLink.mockClear(); mockPublishState.mockClear(); mockClearLifecycle.mockClear();
  expect(review.deletionKind).toBe('completed');
  await deleteRegistration(review.jobId, 'completed', context);
  expect(mockJobs).toEqual({});
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
  expect(mockClearLifecycle).not.toHaveBeenCalled();
});

test('a reorg prevents deletion of an apparently completed registration', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  mockTransactions.get(mockRevealTxid).confirmations = 0;
  await expect(deleteRegistration(review.jobId, 'completed', context)).rejects.toThrow(/still in progress/);
  expect(mockRemoveJob).not.toHaveBeenCalled();
  expect(mockJobs[review.jobId].status).toBe('registration_broadcast');
});

test('a completed record missing its commitment receipt cannot bypass confirmation checks for deletion', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  delete mockJobs[review.jobId].commitment.signedHex;
  await expect(deleteRegistration(review.jobId, 'completed', context)).rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
  expect(mockRemoveJob).not.toHaveBeenCalled();
  expect(mockJobs[review.jobId]).toBeDefined();
});

test('explicit linking is unavailable before registration confirmation', async () => {
  const review = await build();
  await expect(linkRegisteredIdentity(review.jobId, createRegistrationContext())).rejects.toThrow(/registration to confirm/);
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
  expect(mockRefreshLifecycles).not.toHaveBeenCalled();
});

test('a reorg between confirmation and Link to wallet prevents linking', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  mockTransactions.get(mockRevealTxid).confirmations = 0;
  await expect(linkRegisteredIdentity(review.jobId, context)).rejects.toThrow(/registration to confirm/);
  expect(mockJobs[review.jobId].status).toBe('registration_broadcast');
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
});

test('a missing registration with a spent commitment loses registered status and cannot link', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  mockTransactions.delete(mockRevealTxid);
  mockGetTxOut.mockResolvedValue({result: null});
  await expect(linkRegisteredIdentity(review.jobId, context)).rejects.toThrow(/registration to confirm/);
  expect(mockJobs[review.jobId].status).toBe('registration_signed');
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
  expect(mockRefreshLifecycles).not.toHaveBeenCalled();
});

test('wallet refresh failure leaves linking retryable without signing or paying again', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  mockPublishState.mockRejectedValueOnce(new Error('wallet refresh failed'));
  await expect(linkRegisteredIdentity(review.jobId, context)).rejects.toThrow('wallet refresh failed');
  expect(mockJobs[review.jobId]).toMatchObject({status: 'registered', linked: false});
  expect(mockRefreshLifecycles).not.toHaveBeenCalled();
  expect(await linkRegisteredIdentity(review.jobId, context)).toMatchObject({status: 'complete', linked: true});
  expect(mockLink).toHaveBeenCalledTimes(2);
  expect(mockSign).toHaveBeenCalledTimes(2);
  expect(mockSend).toHaveBeenCalledTimes(2);
});

test.each(['link', 'publish'])('an account switch during explicit %s cannot refresh another account wallet', async step => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  const operation = step === 'link' ? mockLink : mockPublishState;
  operation.mockImplementationOnce(async () => {
    mockState.authentication.activeAccount = {accountHash: 'account-b', id: 'profile-b'};
  });
  await expect(linkRegisteredIdentity(review.jobId, context)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  if (step === 'link') expect(mockPublishState).not.toHaveBeenCalled();
  expect(mockClearLifecycle).not.toHaveBeenCalled();
  expect(mockSetUserCoins).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockJobs[review.jobId]).toMatchObject({status: 'registered', linked: false});
});

test('explicitly linked registrations retain their link through a reorg without automatic wallet refresh', async () => {
  const context = createRegistrationContext();
  const review = await registeredReview(context);
  expect(await linkRegisteredIdentity(review.jobId, context)).toMatchObject({status: 'complete', linked: true});
  mockLink.mockClear();
  mockPublishState.mockClear();
  mockClearLifecycle.mockClear();
  mockRefreshLifecycles.mockClear();
  mockTransactions.delete(mockRevealTxid);
  mockGetTxOut.mockResolvedValue({result: null});
  expect(await reconcileRegistration(review.jobId, context)).toMatchObject({status: 'registration_signed', linked: true});
  confirm(mockRevealTxid);
  expect(await reconcileRegistration(review.jobId, context)).toMatchObject({status: 'complete', linked: true});
  expect(mockLink).not.toHaveBeenCalled();
  expect(mockPublishState).not.toHaveBeenCalled();
  expect(mockClearLifecycle).not.toHaveBeenCalled();
  expect(mockRefreshLifecycles).not.toHaveBeenCalled();
});

test.each([
  {systemName: 'VRSC', name: 'ALIce@'},
  {systemName: 'vault.VRSC', name: 'ALIce'},
  {systemName: 'vault.VRSC', name: 'alice.vault.VRSC@'},
])('Create resumes the canonical saved $name registration on $systemName without availability RPC', async ({systemName, name}) => {
  const context = createRegistrationContext();
  const review = await build();
  const systemId = toIAddress(`${systemName}@`);
  const identityAddress = toIAddress(`alice.${systemName}@`);
  Object.assign(mockJobs[review.jobId], {systemId, identityAddress, status: 'registered', linked: false});
  mockResolve.mockClear();
  mockBuildCommitment.mockClear();
  mockGetCurrency.mockClear();
  mockGetIdentity.mockClear();
  mockRandom.mockClear();
  const resumeRequest = {...request, systemId, name};
  expect(await findExistingRegistration(resumeRequest, context)).toMatchObject({jobId: review.jobId, status: 'registered'});
  expect(await prepareCommitment({request: resumeRequest, approvedCosts: {}}, context)).toMatchObject({jobId: review.jobId, status: 'registered'});
  expect(mockResolve).not.toHaveBeenCalled();
  expect(mockBuildCommitment).not.toHaveBeenCalled();
  expect(mockGetCurrency).not.toHaveBeenCalled();
  expect(mockGetIdentity).not.toHaveBeenCalled();
  expect(mockRandom).not.toHaveBeenCalled();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});
