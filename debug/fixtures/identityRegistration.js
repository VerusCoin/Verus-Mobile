const {ECPair, TransactionBuilder, networks} = require('@bitgo/utxo-lib');
const {
  AdvancedNameReservation, IdentityCommitmentScript, IdentityID, KeyID,
  TxDestination, nameAndParentAddrToIAddr,
} = require('verus-typescript-primitives');
const {paymentOutput, readFundingOutput} = require('verusid-ts-client/lib/identity/registrationTransaction');
const {
  inspectIdentityRegistrationSignatures, signIdentityRegistrationTransaction,
} = require('verusid-ts-client/lib/identity/registrationSigning');

const systemId = nameAndParentAddrToIAddr('VRSC');
const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 7), networks.verus);
const controller = key.getAddress();
const copy = value => JSON.parse(JSON.stringify(value));

const builder = () => {
  const transaction = new TransactionBuilder(networks.verus);
  transaction.setVersion(4);
  transaction.setVersionGroupId(0x892f2085);
  transaction.setExpiryHeight(121);
  return transaction;
};

const reservation = () => new AdvancedNameReservation({
  name: 'alice',
  parent: IdentityID.fromAddress(systemId),
  salt: Buffer.from(Array.from({length: 32}, (_, index) => index + 1)),
});

// Real source bytes, reservation scripts and SDK signature inspection exercise
// the same compact format used by the registration workflow.
const makePreparedRegistration = () => {
  const funding = paymentOutput(controller, {[systemId]: '100000000'}, systemId, 'change');
  const sourceBuilder = builder();
  sourceBuilder.addInput(Buffer.alloc(32, 9), 0);
  sourceBuilder.addOutput(Buffer.from(funding.scriptHex, 'hex'), Number(funding.value));
  sourceBuilder.addOutput(Buffer.from(funding.scriptHex, 'hex'), Number(funding.value));
  const source = sourceBuilder.buildIncomplete();
  const prevouts = source.outs.map((output, vout) => ({
    txid: source.getId(), vout, rawTransaction: source.toHex(),
    scriptHex: output.script.toString('hex'), value: String(output.value),
    values: readFundingOutput(output.script, output.value, systemId),
    confirmations: 91, height: 10,
  }));
  const commitment = IdentityCommitmentScript.fromCommitment(
    reservation().getCommitment(), new TxDestination(KeyID.fromAddress(controller)),
  );
  const outputPlan = [
    {role: 'commitment', scriptHex: commitment.toBuffer().toString('hex'), value: '0', values: {[systemId]: '0'}},
    paymentOutput(controller, {[systemId]: '199990000'}, systemId, 'change'),
  ];
  const transaction = builder();
  prevouts.forEach(input => transaction.addInput(Buffer.from(input.txid, 'hex').reverse(), input.vout));
  outputPlan.forEach(output => transaction.addOutput(Buffer.from(output.scriptHex, 'hex'), Number(output.value)));
  const txHex = transaction.buildIncomplete().toHex();
  const prepared = {
    txHex, hex: txHex, prevouts, outputPlan,
    stage: 'commitment', nativeFee: '10000', changeAddress: controller,
    approvedCosts: {[systemId]: '100020000'},
    snapshot: {
      systemID: systemId, rootSystemName: 'VRSC', tipHeight: 100,
      tipHash: '64'.padStart(64, '0'), candidateHeight: 101, expiryDelta: 20, expiryHeight: 121,
    },
    quote: {
      branch: 'native', systemID: systemId, parentID: systemId, issuerID: systemId,
      feePricingCurrencyID: systemId, candidateHeight: 101, commitmentFee: '10000',
      registrationOffer: '100010000', nativeFee: '100010000', importFee: '0', transferFee: '0',
      referralPayments: [], totalRequired: {[systemId]: '100010000'},
      totalOperationRequired: {[systemId]: '100020000'},
    },
    identityAuthorities: [], revealAuthorities: [], signingStatus: 'unsigned',
  };
  prepared.requiredSignatures = inspectIdentityRegistrationSignatures(prepared).inputs;
  return prepared;
};

const makeBaseJob = () => {
  const nameReservation = reservation();
  const identityAddress = nameReservation.getIdentityAddress('VRSC');
  const prepared = makePreparedRegistration();
  const signed = signIdentityRegistrationTransaction({
    ...prepared, keys: prepared.prevouts.map(() => [key.toWIF()]),
  });
  const job = {
    id: 'job-a', accountHash: 'account-a', version: 1, revision: 1,
    systemId, chainTicker: 'VRSC', rootSystemName: 'VRSC',
    fundingAddress: controller, fundingName: null, signingAddress: controller, keyChannel: 'vrpc',
    name: 'alice', displayName: 'alice@', identityAddress,
    linked: false, status: 'commitment_broadcast', createdAt: 1000, updatedAt: 2000,
    saltHex: nameReservation.salt.toString('hex'),
    reservation: {
      schemaVersion: 1, kind: 'advanced', reservationHex: nameReservation.toBuffer().toString('hex'),
      identityAddress, parentID: systemId, systemID: systemId, rootSystemName: 'VRSC',
      fullName: 'alice.VRSC@', commitmentHashHex: nameReservation.getCommitment().toBuffer().toString('hex'),
      controller,
    },
    commitment: {prepared, signedHex: signed.hex, txid: signed.txid, vout: 0},
    currencyNames: {[systemId]: 'VRSC'},
    identityNames: {[systemId]: 'VRSC', [identityAddress]: 'alice@'},
    lastError: null,
  };
  job.request = {
    systemId, chainTicker: job.chainTicker, rootSystemName: job.rootSystemName,
    fundingAddress: controller, signingAddress: controller, keyChannel: job.keyChannel, name: job.name,
  };
  job.identity = {
    version: 3, flags: 0, minimumsignatures: 1, timelock: 0, name: job.name, parent: systemId,
    systemid: systemId, identityaddress: identityAddress, primaryaddresses: [controller],
    recoveryauthority: identityAddress, revocationauthority: identityAddress,
  };
  return job;
};

// Reuse deterministic transaction construction while handing every caller an
// independent mutable job, including its nested approvals and source bytes.
const baseJob = makeBaseJob();
const makeRegistrationJob = (id = 'job-a', overrides = {}) => ({...copy(baseJob), id, ...overrides});

module.exports = {makeRegistrationJob, makePreparedRegistration};
