const {Transaction, TransactionBuilder, networks, script} = require('@bitgo/utxo-lib');
const {registrationApprovalToken} = require('../../identityRegistration/approval');

const copy = value => JSON.parse(JSON.stringify(value));
const outputScript = byte => script.pubKeyHash.output.encode(Buffer.alloc(20, byte));
const makeJob = () => {
  const builder = new TransactionBuilder(networks.verus);
  builder.setVersion(4);
  builder.setVersionGroupId(0x892f2085);
  builder.setExpiryHeight(120);
  builder.addInput(Buffer.alloc(32, 1), 0);
  builder.addInput(Buffer.alloc(32, 2), 1);
  builder.addOutput(outputScript(3), 10000);
  builder.addOutput(outputScript(4), 90000);
  return {
    id: 'registration-job', accountHash: 'account', systemId: 'system',
    rootSystemName: 'VRSC', chainTicker: 'VRSC', keyChannel: 'vrpc',
    fundingAddress: 'i-funding', signingAddress: 'R-controller',
    request: {referralID: 'i-referrer'},
    identity: {
      name: 'alice', parent: 'system', systemid: 'system',
      primaryaddresses: ['R-controller'], recoveryauthority: 'i-recovery',
      revocationauthority: 'i-revocation', minimumsignatures: 1,
    },
    reservation: {
      schemaVersion: 1, kind: 'advanced', reservationHex: '010203',
      identityAddress: 'i-alice', parentID: 'system', systemID: 'system',
      rootSystemName: 'VRSC', fullName: 'alice.VRSC@', commitmentHashHex: 'abcd',
      controller: 'R-controller', authorizationID: 'i-issuer',
    },
    commitment: {
      vout: 0,
      prepared: {
        stage: 'commitment', txHex: builder.buildIncomplete().toHex(),
        snapshot: {systemID: 'system', rootSystemName: 'VRSC', tipHeight: 100, tipHash: 'a', expiryHeight: 120},
        changeAddress: 'i-funding', nativeFee: '10000', approvedCosts: {system: '100010000'},
        quote: {candidateHeight: 101, commitmentFee: '10000', totalOperationRequired: {system: '100010000'}},
        identityAuthorities: [{identityID: 'i-funding', minimumSignatures: 1, primaryAddresses: ['R-controller', 'R-other'], revoked: false}],
        revealAuthorities: [
          {identityID: 'i-issuer', minimumSignatures: 1, primaryAddresses: ['R-controller', 'R-issuer'], revoked: false},
          {identityID: 'i-referrer', minimumSignatures: 1, primaryAddresses: ['R-controller', 'R-referrer'], revoked: false},
        ],
        prevouts: [{txid: '1', vout: 0, confirmations: 10}],
      },
    },
  };
};

const changeTransaction = (job, update) => {
  const transaction = Transaction.fromHex(job.commitment.prepared.txHex, networks.verus);
  update(transaction);
  job.commitment.prepared.txHex = transaction.toHex();
};

test('allows a fresh expiry and chain observation without mutating the saved transaction', () => {
  const job = makeJob();
  const originalHex = job.commitment.prepared.txHex;
  const originalToken = registrationApprovalToken(job);
  expect(originalToken).toMatch(/^[0-9a-f]{64}$/);
  expect(job.commitment.prepared.txHex).toBe(originalHex);
  const refreshed = copy(job);
  changeTransaction(refreshed, transaction => { transaction.expiryHeight = 140; });
  Object.assign(refreshed.commitment.prepared.snapshot, {tipHeight: 120, tipHash: 'b', expiryHeight: 140});
  refreshed.commitment.prepared.quote.candidateHeight = 121;
  refreshed.commitment.prepared.prevouts[0].confirmations = 30;
  expect(refreshed.commitment.prepared.txHex).not.toBe(originalHex);
  expect(registrationApprovalToken(refreshed)).toBe(originalToken);
});

test.each([
  ['funding transaction', transaction => { transaction.ins[0].hash = Buffer.alloc(32, 9); }],
  ['funding output index', transaction => { transaction.ins[0].index = 9; }],
  ['input order', transaction => { transaction.ins.reverse(); }],
  ['input sequence', transaction => { transaction.ins[0].sequence = 0xfffffffe; }],
  ['output destination', transaction => { transaction.outs[0].script = outputScript(9); }],
  ['payment amount', transaction => { transaction.outs[0].value += 1; }],
  ['change amount', transaction => { transaction.outs[1].value += 1; }],
  ['output order', transaction => { transaction.outs.reverse(); }],
  ['locktime', transaction => { transaction.locktime = 1; }],
])('requires fresh approval for changed %s bytes despite an unchanged quote', (_, update) => {
  const job = makeJob();
  const changed = copy(job);
  changeTransaction(changed, update);
  expect(changed.commitment.prepared.quote).toEqual(job.commitment.prepared.quote);
  expect(registrationApprovalToken(changed)).not.toBe(registrationApprovalToken(job));
});

test.each([
  ['account', job => { job.accountHash = 'another-account'; }],
  ['network', job => { job.systemId = 'another-system'; }],
  ['transaction network', job => { job.commitment.prepared.snapshot.systemID = 'another-system'; }],
  ['funding address', job => { job.fundingAddress = 'i-other'; }],
  ['signing address', job => { job.signingAddress = 'R-other'; }],
  ['identity', job => { job.identity.recoveryauthority = 'i-other'; }],
  ['private address', job => { job.identity.privateaddress = 'zs-other'; }],
  ['referral', job => { job.request.referralID = 'i-other'; }],
  ['reservation authorization', job => { job.reservation.authorizationID = 'i-other'; }],
  ['reservation preimage', job => { job.reservation.reservationHex = '040506'; }],
  ['commitment output index', job => { job.commitment.vout = 1; }],
  ['change destination', job => { job.commitment.prepared.changeAddress = 'i-other'; }],
  ['native fee', job => { job.commitment.prepared.nativeFee = '20000'; }],
  ['approved costs', job => { job.commitment.prepared.approvedCosts.system = '100020000'; }],
  ['quote', job => { job.commitment.prepared.quote.commitmentFee = '20000'; }],
  ['funding authority', job => { job.commitment.prepared.identityAuthorities[0].primaryAddresses.push('R-new'); }],
  ['reveal authority', job => { job.commitment.prepared.revealAuthorities[0].minimumSignatures = 2; }],
])('binds %s metadata even when transaction bytes are unchanged', (_, update) => {
  const job = makeJob();
  const changed = copy(job);
  update(changed);
  expect(changed.commitment.prepared.txHex).toBe(job.commitment.prepared.txHex);
  expect(registrationApprovalToken(changed)).not.toBe(registrationApprovalToken(job));
});

test('canonicalizes object keys and authority sets without reordering payment arrays', () => {
  const job = makeJob();
  job.commitment.prepared.quote.referralPayments = [{recipient: 'a', amount: '1'}, {recipient: 'b', amount: '2'}];
  const reordered = copy(job);
  reordered.identity = Object.fromEntries(Object.entries(reordered.identity).reverse());
  reordered.reservation = Object.fromEntries(Object.entries(reordered.reservation).reverse());
  reordered.commitment.prepared.quote = Object.fromEntries(Object.entries(reordered.commitment.prepared.quote).reverse());
  reordered.commitment.prepared.identityAuthorities[0].primaryAddresses.reverse();
  reordered.commitment.prepared.revealAuthorities.reverse().forEach(authority => authority.primaryAddresses.reverse());
  expect(registrationApprovalToken(reordered)).toBe(registrationApprovalToken(job));
  reordered.commitment.prepared.quote.referralPayments.reverse();
  expect(registrationApprovalToken(reordered)).not.toBe(registrationApprovalToken(job));
});

test('binds the registration-stage transaction once it is prepared', () => {
  const job = makeJob();
  const commitmentToken = registrationApprovalToken(job);
  job.registration = {prepared: copy(job.commitment.prepared)};
  job.registration.prepared.stage = 'registration';
  const registrationToken = registrationApprovalToken(job);
  expect(registrationToken).not.toBe(commitmentToken);
  const transaction = Transaction.fromHex(job.registration.prepared.txHex, networks.verus);
  transaction.outs[0].script = outputScript(8);
  job.registration.prepared.txHex = transaction.toHex();
  expect(registrationApprovalToken(job)).not.toBe(registrationToken);
});

test('rejects an unreadable transaction instead of approving metadata alone', () => {
  const job = makeJob();
  job.commitment.prepared.txHex = 'not-a-transaction';
  expect(() => registrationApprovalToken(job)).toThrow();
});
