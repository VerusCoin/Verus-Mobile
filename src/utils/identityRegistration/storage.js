import {Buffer} from 'buffer';
import {Transaction, networks} from '@bitgo/utxo-lib';
import {AdvancedNameReservation} from 'verus-typescript-primitives';
import {convertFqnToDisplayFormat} from '../fullyqualifiedname';
import {
  createPreparedStorageEncoder,
  createPreparedStorageDecoder,
} from './preparedStorage';

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value != null && typeof value === 'object' && !Array.isArray(value);
const copy = value => JSON.parse(JSON.stringify(value));

const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!object(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};

// Object key order is not part of a registration approval. Array order is.
export const registrationStorageEqual = (left, right) =>
  JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

// Omit only facts that are identical to their local reconstruction. Preserve
// explicit choices and optional-field absence so approvals remain unchanged.
const compactFields = (value, defaults) => {
  const values = {...value};
  const absent = [];

  for (const key of Object.keys(defaults)) {
    if (!own(value, key)) absent.push(key);
    else if (registrationStorageEqual(value[key], defaults[key])) delete values[key];
  }

  return {values, ...(absent.length ? {absent} : {})};
};

const restoreFields = (record, defaults) => {
  const value = {...defaults, ...record.values};
  for (const key of record.absent || []) delete value[key];
  return value;
};

const transactionId = hex => Transaction.fromHex(hex, networks.verus).getId();

const reservationDefaults = (hex, fullName, job) => {
  const reservation = AdvancedNameReservation.fromHex(hex);
  if (reservation.toBuffer().toString('hex') !== hex) throw new Error('Noncanonical reservation.');

  return {
    schemaVersion: 1,
    kind: 'advanced',
    reservationHex: hex,
    identityAddress: reservation.getIdentityAddress(job.rootSystemName),
    parentID: reservation.parent.toAddress(),
    systemID: job.systemId,
    rootSystemName: job.rootSystemName,
    fullName,
    commitmentHashHex: reservation.getCommitment().toBuffer().toString('hex'),
    controller: job.signingAddress,
  };
};

const jobDefaults = (job, reservation, context) => {
  const decoded = AdvancedNameReservation.fromHex(reservation.reservationHex);

  return {
    id: context.id,
    accountHash: context.accountHash,
    version: 1,
    linked: false,
    fundingName: null,
    lastError: null,
    name: decoded.name,
    displayName: convertFqnToDisplayFormat(reservation.fullName),
    identityAddress: decoded.getIdentityAddress(job.rootSystemName),
    // JSON uint256 values reverse the bytes; use the serialized salt directly.
    saltHex: decoded.salt.toString('hex'),
  };
};

const requestDefaults = job => ({
  systemId: job.systemId,
  chainTicker: job.chainTicker,
  rootSystemName: job.rootSystemName,
  fundingAddress: job.fundingAddress,
  ...(job.fundingName != null ? {fundingName: job.fundingName} : {}),
  signingAddress: job.signingAddress,
  keyChannel: job.keyChannel,
  name: job.name,
});

// These defaults belong to storage format 2, not to future wallet defaults.
// Custom identities (including content and private addresses) retain overrides.
const identityDefaults = job => ({
  version: 3,
  flags: 0,
  minimumsignatures: 1,
  timelock: 0,
  name: job.name,
  parent: job.reservation?.parentID,
  systemid: job.systemId,
  identityaddress: job.identityAddress,
  primaryaddresses: [job.signingAddress],
  recoveryauthority: job.identityAddress,
  revocationauthority: job.identityAddress,
});

/** Encode one job; the surrounding collection owns its ID and account binding. */
export const encodeRegistrationJob = original => {
  // JSON is the existing persistence contract; never mutate a caller's review.
  const job = copy(original);
  if (!object(job.reservation) || !object(job.request) || !object(job.identity) ||
      typeof job.signingAddress !== 'string' || !job.signingAddress) {
    throw new Error('Invalid identity registration record.');
  }
  const encoder = createPreparedStorageEncoder(job);
  const record = {format: 2};
  const {reservationHex, fullName} = job.reservation;
  record.reservation = {
    bytes: Buffer.from(reservationHex, 'hex').toString('base64'),
    fullName,
    ...compactFields(job.reservation, reservationDefaults(reservationHex, fullName, job)),
  };

  const encodeReceipt = receipt => {
    if (!object(receipt) || !object(receipt.prepared)) throw new Error('Invalid registration receipt.');
    const values = {...receipt};
    const result = {values, plan: encoder.encodePrepared(values.prepared)};
    delete values.prepared;
    // Partial records call their bytes `hex`; complete receipts use signedHex.
    for (const field of ['signedHex', 'hex']) {
      if (own(values, field)) {
        result[field] = encoder.encodeTransaction(values[field]);
        delete values[field];
      }
    }
    if (receipt.signedHex || receipt.hex) {
      if (values.txid !== transactionId(receipt.signedHex || receipt.hex))
        throw new Error('Registration transaction ID does not match its bytes.');
      delete values.txid;
    }
    if (own(values, 'partial')) {
      result.partial = encodeReceipt(values.partial);
      delete values.partial;
    }
    if (own(values, 'previousPartials')) {
      if (!Array.isArray(values.previousPartials)) throw new Error('Invalid registration signature history.');
      result.previousPartials = values.previousPartials.map(encodeReceipt);
      delete values.previousPartials;
    }
    return result;
  };

  const fields = {...job};
  if (record.reservation) delete fields.reservation;
  for (const field of ['commitment', 'registration']) {
    if (own(fields, field)) {
      record[field] = encodeReceipt(fields[field]);
      delete fields[field];
    }
  }
  for (const field of ['previousCommitments', 'previousRegistrations']) {
    if (own(fields, field)) {
      if (!Array.isArray(fields[field])) throw new Error('Invalid registration history.');
      record[field] = fields[field].map(encodeReceipt);
      delete fields[field];
    }
  }
  for (const [field, defaults] of [
    ['request', requestDefaults(job)],
    ['identity', identityDefaults(job)],
  ]) {
    if (object(fields[field])) {
      record[field] = compactFields(fields[field], defaults);
      delete fields[field];
    }
  }

  // Share labels across both maps without losing their original membership or
  // conflating two historical labels for the same address. Own/root labels
  // need no stored text because their exact values are already known locally.
  const labels = [];
  const encodeLabel = ([address, label]) => {
    if (address === job.identityAddress && label === job.displayName) return -1;
    if (address === job.systemId && label === job.rootSystemName) return -2;
    let index = labels.findIndex(entry => entry[0] === address && entry[1] === label);
    if (index < 0) index = labels.push([address, label]) - 1;
    return index;
  };
  for (const field of ['currencyNames', 'identityNames']) {
    if (object(fields[field])) {
      record[field] = Object.entries(fields[field]).map(encodeLabel);
      delete fields[field];
    }
  }
  if (typeof fields.fundingName === 'string') {
    record.fundingName = encodeLabel([job.fundingAddress, fields.fundingName]);
    delete fields.fundingName;
  }
  if (labels.length) record.labels = labels;

  Object.assign(record, compactFields(fields, jobDefaults(job, job.reservation, {
    id: job.id, accountHash: job.accountHash,
  })));
  record.pools = {
    transactions: encoder.transactions,
    plans: encoder.plans,
    authorities: encoder.authorities,
    quotes: encoder.quotes,
  };
  return record;
};

/**
 * Rehydrate locally. Summary reads deliberately skip all prepared input/output
 * decoding and signature inspection; opening one job restores its full plans.
 * Only the current compact format is supported.
 */
export const decodeRegistrationJob = (record, context = {}) => {
  if (!object(record) || record.format !== 2) throw new Error('Unsupported identity registration storage format.');

  const fields = record.values;
  const decoder = createPreparedStorageDecoder(record.pools, fields);
  const {bytes, fullName} = record.reservation;
  const hex = Buffer.from(bytes, 'base64').toString('hex');
  if (Buffer.from(hex, 'hex').toString('base64') !== bytes) throw new Error('Invalid saved reservation encoding.');
  const reservation = restoreFields(record.reservation, reservationDefaults(hex, fullName, fields));

  const job = restoreFields(record, jobDefaults(fields, reservation, context));
  job.reservation = reservation;

  const decodeLabel = index => {
    if (index === -1) return [job.identityAddress, job.displayName];
    if (index === -2) return [job.systemId, job.rootSystemName];
    if (!Number.isSafeInteger(index) || index < 0 || !record.labels?.[index])
      throw new Error('Invalid saved identity label reference.');
    return record.labels[index];
  };
  if (own(record, 'fundingName')) job.fundingName = decodeLabel(record.fundingName)[1];

  const decodeReceipt = receipt => {
    const value = {...receipt.values};
    if (own(receipt, 'plan')) value.prepared = context.summaryOnly
      ? decoder.decodePreparedSummary(receipt.plan)
      : decoder.decodePrepared(receipt.plan);
    for (const field of ['signedHex', 'hex']) {
      if (own(receipt, field)) value[field] = decoder.decodeTransaction(receipt[field]);
    }
    if (value.signedHex || value.hex) {
      value.txid = transactionId(value.signedHex || value.hex);
    }
    if (own(receipt, 'partial') && !context.summaryOnly) value.partial = decodeReceipt(receipt.partial);
    if (own(receipt, 'previousPartials') && !context.summaryOnly)
      value.previousPartials = receipt.previousPartials.map(decodeReceipt);
    return value;
  };

  for (const field of ['commitment', 'registration']) {
    if (own(record, field)) job[field] = decodeReceipt(record[field]);
  }
  for (const field of ['previousCommitments', 'previousRegistrations']) {
    if (own(record, field)) job[field] = record[field].map(decodeReceipt);
  }
  if (record.request && !context.summaryOnly) job.request = restoreFields(record.request, requestDefaults(job));
  if (record.identity && !context.summaryOnly) job.identity = restoreFields(record.identity, identityDefaults(job));

  if (!context.summaryOnly) {
    for (const field of ['currencyNames', 'identityNames']) {
      if (own(record, field)) job[field] = Object.fromEntries(record[field].map(decodeLabel));
    }
  }

  return job;
};
