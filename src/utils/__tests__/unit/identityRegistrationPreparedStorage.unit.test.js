const {ECPair, Transaction, TransactionBuilder, networks} = require('@bitgo/utxo-lib');
const {
  AdvancedNameReservation, IdentityCommitmentScript, IdentityID, KeyID,
  TxDestination, nameAndParentAddrToIAddr,
} = require('verus-typescript-primitives');
const {
  paymentOutput, readFundingOutput,
} = require('verusid-ts-client/lib/identity/registrationTransaction');
const {
  inspectIdentityRegistrationSignatures, signIdentityRegistrationTransaction,
} = require('verusid-ts-client/lib/identity/registrationSigning');
const {
  createPreparedStorageEncoder, createPreparedStorageDecoder,
} = require('../../identityRegistration/preparedStorage');

const copy = value => JSON.parse(JSON.stringify(value));
const system = nameAndParentAddrToIAddr('VRSC');
const token = nameAndParentAddrToIAddr('reserve', system);
const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 7), networks.verus);
const controller = key.getAddress();
const identityAddress = nameAndParentAddrToIAddr('controller', system);

const builder = () => {
  const transaction = new TransactionBuilder(networks.verus);
  transaction.setVersion(4);
  transaction.setVersionGroupId(0x892f2085);
  transaction.setExpiryHeight(121);
  return transaction;
};

// Real source bytes, commitment scripts and SDK signature inspection keep the
// codec tests independent of mocked request/response or transaction schemas.
const fixture = ({identityFunding = false, reserves = false} = {}) => {
  const fundingAddress = identityFunding ? identityAddress : controller;
  const values = {[system]: '100000000', ...(reserves ? {[token]: '50000000'} : {})};
  const funding = paymentOutput(fundingAddress, values, system, 'change');
  const sourceBuilder = builder();
  sourceBuilder.addInput(Buffer.alloc(32, 9), 0);
  sourceBuilder.addOutput(Buffer.from(funding.scriptHex, 'hex'), Number(funding.value));
  sourceBuilder.addOutput(Buffer.from(funding.scriptHex, 'hex'), Number(funding.value));
  const source = sourceBuilder.buildIncomplete();
  const prevouts = source.outs.map((output, vout) => ({
    txid: source.getId(), vout, rawTransaction: source.toHex(),
    scriptHex: output.script.toString('hex'), value: String(output.value),
    values: readFundingOutput(output.script, output.value, system),
    confirmations: 91, height: 10,
  }));
  const reservation = new AdvancedNameReservation({
    name: 'alice', parent: IdentityID.fromAddress(system), salt: Buffer.alloc(32, 3),
  });
  const commitment = IdentityCommitmentScript.fromCommitment(
    reservation.getCommitment(), new TxDestination(KeyID.fromAddress(controller)),
  );
  const outputPlan = [
    {role: 'commitment', scriptHex: commitment.toBuffer().toString('hex'), value: '0', values: {[system]: '0'}},
    paymentOutput(fundingAddress, {[system]: '199990000', ...(reserves ? {[token]: '100000000'} : {})}, system, 'change'),
  ];
  const transaction = builder();
  prevouts.forEach(input => transaction.addInput(Buffer.from(input.txid, 'hex').reverse(), input.vout));
  outputPlan.forEach(output => transaction.addOutput(Buffer.from(output.scriptHex, 'hex'), Number(output.value)));
  const txHex = transaction.buildIncomplete().toHex();
  const identityAuthorities = identityFunding ? [{
    identityID: identityAddress, primaryAddresses: [controller], minimumSignatures: 1, revoked: false,
  }] : [];
  const prepared = {
    txHex, hex: txHex, prevouts, outputPlan,
    stage: 'commitment', nativeFee: '10000', changeAddress: fundingAddress,
    approvedCosts: {[system]: '100020000'},
    snapshot: {
      systemID: system, rootSystemName: 'VRSC', tipHeight: 100,
      tipHash: '64'.padStart(64, '0'), candidateHeight: 101, expiryDelta: 20, expiryHeight: 121,
    },
    quote: {
      branch: 'native', systemID: system, parentID: system, issuerID: system,
      feePricingCurrencyID: system, candidateHeight: 101, commitmentFee: '10000',
      registrationOffer: '100010000', nativeFee: '100010000', importFee: '0', transferFee: '0',
      referralPayments: [], totalRequired: {[system]: '100010000'},
      totalOperationRequired: {[system]: '100020000'},
    },
    identityAuthorities, revealAuthorities: [], signingStatus: 'unsigned',
  };
  prepared.requiredSignatures = inspectIdentityRegistrationSignatures(prepared).inputs;
  return prepared;
};

const persist = encoder => copy({
  transactions: encoder.transactions, plans: encoder.plans,
  authorities: encoder.authorities, quotes: encoder.quotes,
});

describe('offline prepared registration storage', () => {
  it.each([
    {identityFunding: false, reserves: false},
    {identityFunding: false, reserves: true},
    {identityFunding: true, reserves: false},
    {identityFunding: true, reserves: true},
  ])('compacts and reconstructs SDK data with %j', options => {
    const prepared = fixture(options);
    const before = copy(prepared);
    const encoder = createPreparedStorageEncoder();
    const reference = encoder.encodePrepared(prepared);
    const saved = persist(encoder);

    expect(saved.plans[reference]).not.toHaveProperty('literal');
    expect(saved.transactions).toHaveLength(2);
    expect(saved.plans[reference].prevouts.map(input => input.transaction)).toEqual([1, 1]);
    expect(saved.plans[reference].prevouts[0]).not.toHaveProperty('txid');
    expect(saved.plans[reference].prevouts[0]).not.toHaveProperty('vout');
    expect(saved.plans[reference].prevouts[0]).not.toHaveProperty('confirmations');
    expect(saved.plans[reference].data.snapshot).not.toHaveProperty('candidateHeight');
    expect(saved.plans[reference].data.snapshot).not.toHaveProperty('expiryHeight');
    expect(saved.plans[reference].data).not.toHaveProperty('nativeFee');
    expect(saved.quotes[0]).not.toHaveProperty('systemID');
    expect(saved.quotes[0]).not.toHaveProperty('candidateHeight');
    expect(saved.quotes[0]).not.toHaveProperty('totalRequired');
    expect(saved.quotes[0]).not.toHaveProperty('totalOperationRequired');
    expect(saved.transactions[0]).toBe(Buffer.from(prepared.txHex, 'hex').toString('base64'));
    expect(saved.plans[reference]).not.toHaveProperty('requiredSignatures');
    expect(saved.plans[reference]).not.toHaveProperty('outputPlan');
    expect(prepared).toEqual(before);

    const decoded = createPreparedStorageDecoder(saved).decodePrepared(reference);
    expect(decoded).toEqual(before);
    expect(signIdentityRegistrationTransaction({
      ...decoded, keys: decoded.prevouts.map(() => [key.toWIF()]),
    }).signingStatus).toBe('complete');
  });

  it('deduplicates plans, raw transactions, quotes and identical authority snapshots', () => {
    const prepared = fixture({identityFunding: true});
    const encoder = createPreparedStorageEncoder();
    const first = encoder.encodePrepared(prepared);

    expect(encoder.encodePrepared(copy(prepared))).toBe(first);
    expect(encoder.encodeTransaction(prepared.txHex)).toBe(0);
    expect(encoder.plans).toHaveLength(1);
    expect(encoder.transactions).toHaveLength(2);
    expect(encoder.quotes).toHaveLength(1);

    const changed = copy(prepared);
    changed.identityAuthorities[0].minimumSignatures = 2;
    changed.identityAuthorities[0].primaryAddresses.push(
      ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 8), networks.verus).getAddress(),
    );
    changed.requiredSignatures = inspectIdentityRegistrationSignatures(changed).inputs;
    const second = encoder.encodePrepared(changed);

    expect(second).not.toBe(first);
    expect(encoder.plans[second]).not.toHaveProperty('literal');
    expect(encoder.transactions).toHaveLength(2);
    expect(encoder.quotes).toHaveLength(1);
    expect(encoder.authorities).toHaveLength(3);
    const decoder = createPreparedStorageDecoder(persist(encoder));
    expect(decoder.decodePrepared(first)).toEqual(prepared);
    expect(decoder.decodePrepared(second)).toEqual(changed);
  });

  it('shares economic quotes across different historical chain snapshots', () => {
    const first = fixture();
    const later = copy(first);
    const transaction = Transaction.fromHex(later.txHex, networks.verus);
    transaction.expiryHeight++;
    later.txHex = later.hex = transaction.toHex();
    later.snapshot.tipHeight++;
    later.snapshot.candidateHeight++;
    later.snapshot.expiryHeight++;
    later.snapshot.tipHash = '65'.padStart(64, '0');
    later.quote.candidateHeight++;
    later.prevouts.forEach(input => input.confirmations++);
    const encoder = createPreparedStorageEncoder();
    const references = [encoder.encodePrepared(first), encoder.encodePrepared(later)];

    expect(encoder.plans.every(plan => !Object.prototype.hasOwnProperty.call(plan, 'literal'))).toBe(true);
    expect(encoder.quotes).toHaveLength(1);
    const decoder = createPreparedStorageDecoder(persist(encoder));
    expect(references.map(reference => decoder.decodePrepared(reference))).toEqual([first, later]);
    expect(decoder.decodePreparedSummary(references[1]).quote.candidateHeight).toBe(102);
  });

  it('reconstructs token/referral totals and preserves historical relay fee increases', () => {
    const prepared = fixture({reserves: true});
    prepared.quote = {
      ...prepared.quote, branch: 'token-burn', parentID: token, issuerID: token,
      feePricingCurrencyID: token, registrationOffer: '70000000',
      nativeFee: '30000', importFee: '10000', transferFee: '20000',
      issuerPayment: {currencyID: token, recipient: token, amount: '60000000', kind: 'burn'},
      referralPayments: [{currencyID: token, recipient: identityAddress, amount: '10000000'}],
      totalRequired: {[system]: '50000', [token]: '70000000'},
      totalOperationRequired: {[system]: '60000', [token]: '70000000'},
    };
    prepared.approvedCosts = {...prepared.quote.totalOperationRequired};
    const encoder = createPreparedStorageEncoder();
    const reference = encoder.encodePrepared(prepared);

    expect(encoder.plans[reference]).not.toHaveProperty('literal');
    expect(createPreparedStorageDecoder(persist(encoder)).decodePrepared(reference)).toEqual(prepared);
  });

  it('stores matching chain and funding context once at the job level', () => {
    const prepared = fixture();
    const job = {systemId: system, rootSystemName: 'VRSC', fundingAddress: controller};
    const encoder = createPreparedStorageEncoder(job);
    const reference = encoder.encodePrepared(prepared);
    const saved = persist(encoder);

    expect(saved.plans[reference].data.snapshot).not.toHaveProperty('systemID');
    expect(saved.plans[reference].data.snapshot).not.toHaveProperty('rootSystemName');
    expect(saved.plans[reference].data).not.toHaveProperty('changeAddress');
    expect(createPreparedStorageDecoder(saved, job).decodePrepared(reference)).toEqual(prepared);
    expect(createPreparedStorageDecoder(saved, job).decodePreparedSummary(reference)).toEqual({quote: prepared.quote});
  });

  it('retains explicit context differences and rejects missing approval fields', () => {
    const prepared = fixture();
    const job = {systemId: token, rootSystemName: 'OTHER', fundingAddress: identityAddress};
    const encoder = createPreparedStorageEncoder(job);
    const reference = encoder.encodePrepared(prepared);

    expect(encoder.plans[reference].data.changeAddress).toBe(controller);
    expect(encoder.plans[reference].data.snapshot.systemID).toBe(system);
    expect(createPreparedStorageDecoder(persist(encoder), job).decodePrepared(reference)).toEqual(prepared);

    delete prepared.changeAddress;
    expect(() => encoder.encodePrepared(prepared)).toThrow('Noncanonical prepared receipt');
    expect(encoder.plans).toHaveLength(1);
  });

  it('retains independent unsigned approval and exact partial/signed transaction bytes', () => {
    const prepared = fixture();
    const signed = signIdentityRegistrationTransaction({...prepared, keys: [[key.toWIF()], [key.toWIF()]]});
    const partial = signIdentityRegistrationTransaction({...prepared, keys: [[key.toWIF()], []]});
    const encoder = createPreparedStorageEncoder();
    const plan = encoder.encodePrepared(prepared);
    const signedReference = encoder.encodeTransaction(signed.hex);
    const partialReference = encoder.encodeTransaction(partial.hex);
    const decoder = createPreparedStorageDecoder(persist(encoder));

    expect(decoder.decodePrepared(plan).txHex).toBe(prepared.txHex);
    expect(decoder.decodeTransaction(signedReference)).toBe(signed.hex);
    expect(decoder.decodeTransaction(partialReference)).toBe(partial.hex);
    expect(decoder.decodePrepared(plan).txHex).not.toBe(signed.hex);
    expect(inspectIdentityRegistrationSignatures({...prepared, txHex: decoder.decodeTransaction(signedReference)}).txid).toBe(signed.txid);
  });

  it.each([
    ['wrong alias', prepared => { prepared.hex = '00'; }],
    ['wrong amount', prepared => { prepared.prevouts[0].value = '7'; }],
    ['wrong source bytes', prepared => { prepared.prevouts[0].rawTransaction = 'invalid'; }],
    ['wrong output amount', prepared => { prepared.outputPlan[0].values[system] = '1'; }],
    ['wrong signature requirement', prepared => { prepared.requiredSignatures[0].threshold = 5; }],
    ['missing signature requirements', prepared => { delete prepared.requiredSignatures; }],
    ['missing signing status', prepared => { delete prepared.signingStatus; }],
    ['missing signing authorities', prepared => { delete prepared.identityAuthorities; }],
    ['missing reveal authorities', prepared => { delete prepared.revealAuthorities; }],
    ['missing quote', prepared => { delete prepared.quote; }],
    ['wrong outpoint', prepared => { prepared.prevouts[0].vout = 1; }],
    ['wrong confirmations', prepared => { prepared.prevouts[0].confirmations = 5; }],
    ['wrong candidate height', prepared => { prepared.snapshot.candidateHeight = 102; }],
    ['wrong expiry height', prepared => { prepared.snapshot.expiryHeight = 122; }],
    ['wrong fee alias', prepared => { prepared.nativeFee = '30000'; }],
    ['wrong quote system', prepared => { prepared.quote.systemID = token; }],
    ['wrong quote height', prepared => { prepared.quote.candidateHeight = 2; }],
    ['wrong reveal total', prepared => { prepared.quote.totalRequired[system] = '1'; }],
    ['wrong operation total', prepared => { prepared.quote.totalOperationRequired[system] = '2'; }],
    ['missing quote totals', prepared => { delete prepared.quote.totalRequired; }],
    ['extra output metadata', prepared => { prepared.outputPlan[0].futureField = 'retain'; }],
  ])('rejects %s instead of repairing it', (description, change) => {
    const prepared = fixture();
    change(prepared);
    const encoder = createPreparedStorageEncoder();
    const before = copy(prepared);
    expect(() => encoder.encodePrepared(prepared)).toThrow();
    expect(prepared).toEqual(before);
    expect(encoder.plans).toHaveLength(0);
    expect(encoder.transactions).toHaveLength(0);
  });

  it('preserves unknown metadata and keeps decoded plan copies independent', () => {
    const prepared = fixture();
    prepared.futurePolicy = {note: 'Keep this original approval', values: ['one', 'two']};
    const encoder = createPreparedStorageEncoder();
    const reference = encoder.encodePrepared(prepared);
    const decoder = createPreparedStorageDecoder(persist(encoder));
    const first = decoder.decodePrepared(reference);
    first.futurePolicy.values[0] = 'changed';
    first.prevouts[0].values[system] = '0';

    expect(encoder.plans[reference]).not.toHaveProperty('literal');
    expect(decoder.decodePrepared(reference)).toEqual(prepared);
  });

  it.each([null, {}, {txHex: 'invalid', quote: {totalRequired: {[system]: '123'}}}])(
    'rejects malformed prepared records: %j', prepared => {
      const encoder = createPreparedStorageEncoder();
      expect(() => encoder.encodePrepared(prepared)).toThrow();
      expect(encoder.plans).toHaveLength(0);
    },
  );

  it('reads a public summary without parsing or accessing stored transaction bytes', () => {
    const prepared = fixture();
    const encoder = createPreparedStorageEncoder();
    const reference = encoder.encodePrepared(prepared);
    const saved = persist(encoder);
    Object.defineProperty(saved, 'transactions', {get: () => { throw new Error('Do not decode transactions for summaries'); }});

    expect(createPreparedStorageDecoder(saved).decodePreparedSummary(reference)).toEqual({quote: prepared.quote});
  });

  it.each(['not-hex', '00AB', '00', '', null])('rejects invalid transaction values: %j', value => {
    const encoder = createPreparedStorageEncoder();
    expect(() => encoder.encodeTransaction(value)).toThrow();
    expect(encoder.transactions).toHaveLength(0);
  });

  it('rejects broken references and noncanonical base64 without returning repaired bytes', () => {
    const decoder = createPreparedStorageDecoder({transactions: ['not base64'], plans: [], authorities: [], quotes: []});
    expect(() => decoder.decodePrepared(0)).toThrow('Invalid compact registration plan reference');
    expect(() => decoder.decodeTransaction(-1)).toThrow('Invalid compact registration transaction reference');
    expect(() => decoder.decodeTransaction(0)).toThrow('Invalid compact registration transaction bytes');
  });
});
