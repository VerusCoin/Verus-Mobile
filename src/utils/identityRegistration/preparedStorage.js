import {Buffer} from 'buffer';
import BN from 'bn.js';
import {
  IdentityCommitmentScript,
  ReserveTransfer,
  SmartTransactionScript,
} from 'verus-typescript-primitives';
import {
  parseTransaction,
  readFundingOutput,
} from 'verusid-ts-client/lib/identity/registrationTransaction';
import {inspectIdentityRegistrationSignatures} from 'verusid-ts-client/lib/identity/registrationSigning';

const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

// JSON object order is not part of the record. Values, missing fields, array
// order, and historical approval data must all survive storage unchanged.
const ordered = value => {
  if (Array.isArray(value)) return value.map(ordered);
  if (value == null || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = ordered(value[key]);
    return result;
  }, Object.create(null));
};

const keyFor = value => JSON.stringify(ordered(value));

const createPool = () => {
  const values = [];
  const indexes = new Map();

  return {
    values,
    add: value => {
      const key = keyFor(value);
      if (indexes.has(key)) return indexes.get(key);
      const index = values.length;
      values.push(copy(value));
      indexes.set(key, index);
      return index;
    },
  };
};

const poolValue = (pool, reference, name) => {
  if (!Array.isArray(pool) || !Number.isInteger(reference) || reference < 0 || reference >= pool.length) {
    throw new Error(`Invalid compact registration ${name} reference.`);
  }
  return pool[reference];
};

const outputValues = (output, systemID, role) => {
  const native = {[systemID]: String(output.value)};

  if (['commitment', 'identity', 'reservation'].includes(role)) return native;

  if (role === 'burn') {
    const script = new SmartTransactionScript();
    script.fromBuffer(output.script, 0, output.script.length);
    const transfer = new ReserveTransfer();
    transfer.fromBuffer(script.paramsOptCC.vData[0]);
    transfer.reserveValues.valueMap.forEach((amount, currency) => {
      native[currency] = amount.toString(10);
    });
    return native;
  }

  return readFundingOutput(output.script, output.value, systemID);
};

const prevoutValues = (output, systemID) => {
  try {
    return readFundingOutput(output.script, output.value, systemID);
  } catch (error) {
    // Reveals spend the original zero-value commitment as well as ordinary
    // funding. The ordinary-output decoder intentionally rejects commitments.
    const commitment = new IdentityCommitmentScript();
    commitment.fromBuffer(output.script, 0, output.script.length);
    if (commitment.getCommitment().isAdvanced()) throw error;
    return {[systemID]: String(output.value)};
  }
};

// Keep historical prices and recipients; totals and chain context are aliases.
// In particular, use the saved native fee, which may include a relay increase.
const expandQuote = (quote, snapshot) => {
  const totalRequired = {
    [snapshot.systemID]: new BN(quote.nativeFee, 10).add(new BN(quote.transferFee, 10)).toString(10),
  };
  const payments = [...(quote.issuerPayment ? [quote.issuerPayment] : []), ...quote.referralPayments];

  payments.forEach(payment => {
    totalRequired[payment.currencyID] = new BN(totalRequired[payment.currencyID] || '0', 10)
      .add(new BN(payment.amount, 10)).toString(10);
  });

  return {
    ...quote,
    systemID: snapshot.systemID,
    candidateHeight: snapshot.candidateHeight,
    totalRequired,
    totalOperationRequired: {
      ...totalRequired,
      [snapshot.systemID]: new BN(totalRequired[snapshot.systemID], 10)
        .add(new BN(quote.commitmentFee, 10)).toString(10),
    },
  };
};

const expandSnapshot = (snapshot, job) => ({
  ...(job.systemId === undefined ? {} : {systemID: job.systemId}),
  ...(job.rootSystemName === undefined ? {} : {rootSystemName: job.rootSystemName}),
  ...snapshot,
  candidateHeight: snapshot.tipHeight + 1,
});

/** Expand only from retained approval bytes and source transactions, never RPC. */
const expandPrepared = (record, readTransaction, readAuthority, readQuote, job) => {
  const parsed = new Map();
  const parse = hex => {
    if (!parsed.has(hex)) parsed.set(hex, parseTransaction(hex));
    return parsed.get(hex);
  };
  const txHex = readTransaction(record.transaction);
  const transaction = parse(txHex);
  const snapshot = {
    ...expandSnapshot(record.data.snapshot, job),
    expiryHeight: transaction.expiryHeight,
  };
  const systemID = snapshot.systemID;
  const quote = expandQuote(readQuote(record.quote), snapshot);
  const identityAuthorities = readAuthority(record.identityAuthorities);
  const prepared = {
    ...(job.fundingAddress === undefined ? {} : {changeAddress: job.fundingAddress}),
    ...record.data,
    txHex,
    hex: txHex,
    snapshot,
    quote,
    nativeFee: record.data.stage === 'commitment' ? quote.commitmentFee : quote.nativeFee,
    identityAuthorities,
    revealAuthorities: readAuthority(record.revealAuthorities),
    signingStatus: 'unsigned',
    prevouts: record.prevouts.map(({transaction: sourceReference, ...metadata}, index) => {
      const rawTransaction = readTransaction(sourceReference);
      const source = parse(rawTransaction);
      const input = transaction.ins[index];
      const output = input && source.outs[input.index];

      if (!output) throw new Error('Invalid compact registration previous output.');

      return {
        ...metadata,
        txid: source.getId(),
        vout: input.index,
        rawTransaction,
        scriptHex: output.script.toString('hex'),
        value: String(output.value),
        values: prevoutValues(output, systemID),
        confirmations: metadata.height ? snapshot.candidateHeight - metadata.height : 0,
      };
    }),
    outputPlan: record.roles.map((role, index) => {
      const output = transaction.outs[index];
      if (!output) throw new Error('Invalid compact registration planned output.');

      return {
        role,
        scriptHex: output.script.toString('hex'),
        value: String(output.value),
        values: outputValues(output, systemID, role),
      };
    }),
  };

  if (record.commitment) {
    const {transaction: reference, ...metadata} = record.commitment;
    prepared.commitment = {...metadata, rawTransaction: readTransaction(reference)};
  }

  prepared.requiredSignatures = inspectIdentityRegistrationSignatures({
    txHex,
    prevouts: prepared.prevouts,
    identityAuthorities,
  }).inputs;

  return prepared;
};

/**
 * One encoder belongs to one saved job, including its historical receipts.
 * Pools deduplicate exact data, so an authority change or different approval
 * remains a distinct historical record even when its identity ID is the same.
 */
export const createPreparedStorageEncoder = (job = {}) => {
  const transactions = createPool();
  const plans = createPool();
  const authorities = createPool();
  const quotes = createPool();
  const preparedReferences = new Map();

  const encodeTransaction = hex => {
    if (typeof hex !== 'string' || !/^(?:[0-9a-f]{2})+$/.test(hex)) {
      throw new Error('Invalid registration transaction hex.');
    }
    parseTransaction(hex);
    return transactions.add(Buffer.from(hex, 'hex').toString('base64'));
  };

  const encodePrepared = value => {
    const prepared = copy(value);
    const key = keyFor(prepared);
    if (preparedReferences.has(key)) return preparedReferences.get(key);

    const save = record => {
      const reference = plans.add(record);
      preparedReferences.set(key, reference);
      return reference;
    };

    const {
      txHex, hex, prevouts, outputPlan, requiredSignatures, signingStatus, nativeFee,
      identityAuthorities, revealAuthorities, quote, ...data
    } = prepared;

    // Required approval metadata must exist before entering the shared pools.
    if (!Array.isArray(identityAuthorities) || !Array.isArray(revealAuthorities) ||
        !quote || typeof quote !== 'object' || Array.isArray(quote)) {
      throw new Error('Unsupported prepared approval metadata.');
    }

    const {candidateHeight, expiryHeight, ...snapshot} = data.snapshot;
    if (snapshot.systemID === job.systemId) delete snapshot.systemID;
    if (snapshot.rootSystemName === job.rootSystemName) delete snapshot.rootSystemName;
    if (data.changeAddress === job.fundingAddress) delete data.changeAddress;
    data.snapshot = snapshot;
    const {
      systemID, candidateHeight: quoteHeight, totalRequired, totalOperationRequired, ...economics
    } = quote;
    const candidate = {
      data,
      transaction: txHex,
      quote: economics,
      identityAuthorities,
      revealAuthorities,
      prevouts: prevouts.map(({
        rawTransaction, scriptHex, value: amount, values, txid, vout, confirmations, ...metadata
      }) => ({
        ...metadata,
        transaction: rawTransaction,
      })),
      roles: outputPlan.map(output => output.role),
    };

    if (data.commitment && has(data.commitment, 'rawTransaction')) {
      const {rawTransaction, ...metadata} = data.commitment;
      candidate.commitment = {...metadata, transaction: rawTransaction};
      delete data.commitment;
    }

    // Never repair a mismatched receipt while saving it. Only remove
    // fields when pure reconstruction reproduces the entire original record.
    const expanded = expandPrepared(candidate, item => item, item => item, item => item, job);
    if (keyFor(expanded) !== keyFor(prepared)) throw new Error('Noncanonical prepared receipt.');

    const compact = {
      ...candidate,
      transaction: encodeTransaction(candidate.transaction),
      quote: quotes.add(candidate.quote),
      identityAuthorities: authorities.add(candidate.identityAuthorities),
      revealAuthorities: authorities.add(candidate.revealAuthorities),
      prevouts: candidate.prevouts.map(prevout => ({
        ...prevout,
        transaction: encodeTransaction(prevout.transaction),
      })),
    };

    if (candidate.commitment) compact.commitment = {
      ...candidate.commitment,
      transaction: encodeTransaction(candidate.commitment.transaction),
    };

    return save(compact);
  };

  return {
    transactions: transactions.values,
    plans: plans.values,
    authorities: authorities.values,
    quotes: quotes.values,
    encodeTransaction,
    encodePrepared,
  };
};

export const createPreparedStorageDecoder = (pools, job = {}) => {
  const transactionCache = new Map();
  const preparedCache = new Map();

  const decodeTransaction = reference => {
    if (transactionCache.has(reference)) return transactionCache.get(reference);
    const value = poolValue(pools.transactions, reference, 'transaction');
    if (typeof value !== 'string' || !value || Buffer.from(value, 'base64').toString('base64') !== value) {
      throw new Error('Invalid compact registration transaction bytes.');
    }
    const hex = Buffer.from(value, 'base64').toString('hex');

    transactionCache.set(reference, hex);
    return hex;
  };

  const readAuthority = reference => copy(poolValue(pools.authorities, reference, 'authority'));
  const readQuote = reference => copy(poolValue(pools.quotes, reference, 'quote'));

  const decodePrepared = reference => {
    if (!preparedCache.has(reference)) {
      const record = poolValue(pools.plans, reference, 'plan');
      preparedCache.set(reference, expandPrepared(record, decodeTransaction, readAuthority, readQuote, job));
    }
    // Receipt mutation must not change another receipt sharing the same plan.
    return copy(preparedCache.get(reference));
  };

  const decodePreparedSummary = reference => {
    const record = poolValue(pools.plans, reference, 'plan');
    return {
      quote: expandQuote(readQuote(record.quote), expandSnapshot(record.data.snapshot, job)),
    };
  };

  return {decodeTransaction, decodePrepared, decodePreparedSummary};
};
