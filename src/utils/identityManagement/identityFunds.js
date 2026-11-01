import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {ECPair, Transaction, networks} from '@bitgo/utxo-lib';
import {
  SmartTransactionScript,
  IdentityReservationScript,
  IdentityScript,
  TokenOutput,
  EVALS,
  I_ADDR_VERSION,
  R_ADDR_VERSION,
  fromBase58Check,
  toBase58Check,
} from 'verus-typescript-primitives';

const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

const resultOf = response => {
  if (response?.error) throw new Error(response.error.message || 'Unable to check identity funds.');

  requireValue(
    response && Object.prototype.hasOwnProperty.call(response, 'result'),
    'Unable to check identity funds.',
  );

  return response.result;
};

const amount = value => {
  requireValue(
    typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value),
    'Invalid identity currency amount.',
  );

  const number = new BigNumber(value);
  requireValue(number.lte('5000000000000000000'), 'Identity currency amount exceeds the permitted range.');

  return number;
};

const currency = address => {
  const decoded = fromBase58Check(address);

  requireValue(
    decoded.version === I_ADDR_VERSION &&
      decoded.hash.length === 20 &&
      !decoded.hash.equals(Buffer.alloc(20)),
    'Unsupported identity currency.',
  );
};

/** Read amounts from canonical output bytes, never the address index's currencyvalues. */
export const identityOutputAmounts = (output, systemId, recipient) => {
  requireValue(
    Number.isSafeInteger(output.value) && output.value >= 0 && output.value <= 2100000000000000,
    'Unsupported native identity amount.',
  );

  const values = new Map([[systemId, amount(String(output.value))]]);
  const bytes = output.script;

  // Mature mining rewards may pay a public key directly. Validate the key and
  // its exact R-address before accepting this ordinary native-only source.
  if (
    ((bytes.length === 35 && bytes[0] === 33) || (bytes.length === 67 && bytes[0] === 65)) &&
    bytes[bytes.length - 1] === 0xac
  ) {
    const key = ECPair.fromPublicKeyBuffer(bytes.subarray(1, bytes.length - 1), networks.verus);
    requireValue(key.getAddress() === recipient, 'Unexpected identity funds destination.');

    return values;
  }

  if (
    bytes.length === 25 &&
    bytes.subarray(0, 3).equals(Buffer.from('76a914', 'hex')) &&
    bytes.subarray(23).equals(Buffer.from('88ac', 'hex'))
  ) {
    requireValue(
      toBase58Check(bytes.subarray(3, 23), R_ADDR_VERSION) === recipient,
      'Unexpected identity funds destination.',
    );

    return values;
  }

  // Smart outputs must have one supported controller and canonical encoding.
  requireValue(bytes.length <= 10000 && bytes[0] > 0 && bytes[0] < 76, 'Unsupported identity funds output.');
  const smart = new SmartTransactionScript();
  smart.fromBuffer(bytes, 0, bytes.length);
  requireValue(smart.toBuffer().equals(bytes), 'Noncanonical identity funds output.');

  const master = smart.masterOptCC;
  const condition = smart.paramsOptCC;
  requireValue(
    master.version.eqn(3) &&
      master.evalCode.eqn(EVALS.EVAL_NONE) &&
      !master.vData.length &&
      condition.version.eqn(3) &&
      condition.m.eqn(1) &&
      condition.n.eqn(1) &&
      condition.destinations.length === 1 &&
      condition.destinations[0].toAddress() === recipient,
    'Identity funds use unsupported signing conditions.',
  );

  const emptyMaster = master.m.isZero() && master.n.isZero() && !master.destinations.length;
  const sameMaster = master.m.eqn(1) && master.n.eqn(1) &&
    master.destinations.length === 1 &&
    master.destinations[0].toBuffer().equals(condition.destinations[0].toBuffer());
  requireValue(emptyMaster || sameMaster, 'Identity funds use alternate signing conditions.');

  if (condition.evalCode.eqn(EVALS.EVAL_NONE)) {
    requireValue(!condition.vData.length, 'Unexpected data in identity funds output.');

    return values;
  }

  requireValue(
    condition.evalCode.eqn(EVALS.EVAL_RESERVE_OUTPUT) &&
      condition.vData.length === 1 &&
      condition.toChunk().length + 1 + master.toChunk().length < 6000,
    'This identity has funds in an unsupported output type. Move those funds before transferring it.',
  );

  const token = new TokenOutput();
  const payload = condition.vData[0];
  requireValue(
    token.fromBuffer(payload) === payload.length && token.isValid() && token.toBuffer().equals(payload),
    'Invalid identity reserve currency encoding.',
  );

  for (const [id, value] of token.reserveValues.valueMap) {
    currency(id);
    requireValue(id !== systemId, 'Identity reserve output duplicates native currency.');
    values.set(id, amount(value.toString(10)));
  }

  return values;
};

export const addIdentityAmounts = (totals, values) => {
  for (const [id, value] of values)
    totals.set(id, amount((totals.get(id) || new BigNumber(0)).plus(value).toFixed(0)));

  return totals;
};

const isEmptyMetadata = (output, spendable) => {
  if (output.value !== 0 || (spendable !== false && spendable !== 0)) return false;

  for (const Type of [IdentityReservationScript, IdentityScript]) {
    try {
      const parsed = new Type();
      parsed.fromBuffer(output.script, 0, output.script.length);
      if (parsed.toBuffer().equals(output.script)) return true;
    } catch (_) {
      /* Only recognized, fully decoded metadata can be omitted. */
    }
  }

  try {
    const parsed = new SmartTransactionScript();
    parsed.fromBuffer(output.script, 0, output.script.length);
    return parsed.toBuffer().equals(output.script) &&
      parsed.masterOptCC.evalCode.eqn(EVALS.EVAL_NONE) &&
      !parsed.masterOptCC.vData.length &&
      parsed.paramsOptCC.evalCode.eqn(EVALS.EVAL_NOTARY_EVIDENCE);
  } catch (_) {
    return false;
  }
};

/** All indexed outputs must be accounted for, including token-only and locked funds. */
export const readIdentityFunds = async ({endpoint, systemId, subject, call}) => {
  const pending = resultOf(await call(() => endpoint.getAddressMempool({
    addresses: [subject.address],
    friendlynames: true,
    verbosity: 1,
  })));
  requireValue(Array.isArray(pending), 'Unable to verify pending identity funds.');
  requireValue(!pending.length, 'This identity has pending transactions. Wait for them to confirm before transferring it.');

  const indexed = resultOf(await call(() => endpoint.getAddressUtxos({
    addresses: [subject.address],
    friendlynames: true,
  })));
  const entries = Array.isArray(indexed) ? indexed : indexed?.utxos;
  requireValue(Array.isArray(entries), 'Unable to verify all identity funds.');

  const seen = new Set();
  const cache = new Map();
  const balances = new Map();
  const utxos = [];

  // Verify each indexed candidate against its transaction before adding funds.
  for (const entry of entries) {
    requireValue(
      /^[0-9a-f]{64}$/.test(entry.txid) &&
        Number.isSafeInteger(entry.outputIndex) && entry.outputIndex >= 0 &&
        Number.isSafeInteger(entry.height) && entry.height > 0,
      'The identity funds index returned an invalid output.',
    );

    const outpoint = `${entry.txid}:${entry.outputIndex}`;
    requireValue(!seen.has(outpoint), 'The identity funds index returned a duplicate output.');
    seen.add(outpoint);
    if (entry.txid === subject.txid && entry.outputIndex === subject.vout) continue;

    let tx = cache.get(entry.txid);
    if (!tx) {
      const response = resultOf(await call(() => endpoint.getRawTransaction(entry.txid, 0)));
      const hex = typeof response === 'string' ? response : response?.hex;
      requireValue(
        typeof hex === 'string' && /^(?:[0-9a-f]{2})+$/i.test(hex),
        'Unable to verify identity funds transaction.',
      );

      tx = Transaction.fromHex(hex, networks.verus);
      requireValue(
        tx.getId() === entry.txid && tx.toHex() === hex.toLowerCase(),
        'Identity funds transaction does not match its output.',
      );
      cache.set(entry.txid, tx);
    }

    const output = tx.outs[entry.outputIndex];
    requireValue(output, 'Identity funds output is missing.');
    if (isEmptyMetadata(output, entry.isspendable)) continue;

    const values = identityOutputAmounts(output, systemId, subject.address);
    addIdentityAmounts(balances, values);
    utxos.push({
      ...entry,
      address: subject.address,
      script: output.script.toString('hex'),
      satoshis: output.value,
    });
  }

  const snapshot = JSON.stringify(
    utxos
      .map(input => [input.txid, input.outputIndex, input.script, input.satoshis, input.isspendable])
      .sort((a, b) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`)),
  );

  return {utxos, balances, snapshot};
};
