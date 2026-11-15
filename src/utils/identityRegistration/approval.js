import {Buffer} from 'buffer';
import {Transaction, networks} from '@bitgo/utxo-lib';
import {sha256} from '../crypto/hash';

const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = canonical(value[key]);
      return result;
    }, Object.create(null));
  }
  return value;
};

const serialize = value => JSON.stringify(canonical(value));

const normalizeAuthorities = authorities => (authorities || []).map(authority => ({
  ...authority,
  primaryAddresses: authority.primaryAddresses && [...authority.primaryAddresses].sort(),
})).sort((left, right) => {
  const a = serialize(left);
  const b = serialize(right);
  return a < b ? -1 : a > b ? 1 : 0;
});

// A fresh expiry is routine, but every input, output and other transaction byte
// stays bound to the review. Parsing creates a copy without changing the plan.
const approvedTransactionHex = prepared => {
  const transaction = Transaction.fromHex(prepared.txHex, networks.verus);
  transaction.expiryHeight = 0;
  return transaction.toHex();
};

export const registrationApprovalToken = job => {
  const stage = job.registration?.prepared ? 'registration' : 'commitment';
  const prepared = job[stage].prepared;
  const approval = {
    schemaVersion: 1,
    jobId: job.id,
    accountHash: job.accountHash,
    stage,
    systemId: job.systemId,
    rootSystemName: job.rootSystemName,
    chainTicker: job.chainTicker,
    keyChannel: job.keyChannel,
    fundingAddress: job.fundingAddress,
    signingAddress: job.signingAddress,
    identity: job.identity,
    referralID: job.request.referralID || null,
    reservation: job.reservation,
    commitmentVout: job.commitment.vout,
    transaction: approvedTransactionHex(prepared),
    transactionSystemId: prepared.snapshot.systemID,
    transactionRootSystemName: prepared.snapshot.rootSystemName,
    changeAddress: prepared.changeAddress,
    nativeFee: prepared.nativeFee,
    approvedCosts: prepared.approvedCosts,
    quote: {...prepared.quote, candidateHeight: undefined},
    identityAuthorities: normalizeAuthorities(prepared.identityAuthorities),
    revealAuthorities: normalizeAuthorities(prepared.revealAuthorities),
  };
  return sha256(Buffer.from(serialize(approval), 'utf8')).toString('hex');
};
