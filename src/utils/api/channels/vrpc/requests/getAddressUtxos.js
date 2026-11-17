import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";
import BigNumber from "bignumber.js";
import { getAddressMempool } from "./getAddressMempool";
import { getTransaction } from "./getTransaction";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}

// The address-unspent index can still contain inputs spent in the mempool.
// Keep this exclusion-only contract for callers with an existing input plan.
export const excludeMempoolSpentUtxos = (utxos, mempool, transactions = []) => {
  const spent = new Set(
    mempool.filter(entry => entry.spending === true &&
      typeof entry.prevtxid === 'string' && entry.prevtxid.length > 0 &&
      Number.isInteger(entry.prevout) && entry.prevout >= 0)
      .map(entry => `${entry.prevtxid}:${entry.prevout}`),
  );

  // Token-only spends have zero native value, so verusd omits prevtxid/prevout.
  // Read all inputs, including those not represented by the address deltas.
  for (const transaction of transactions) {
    for (const input of transaction.vin) {
      spent.add(`${input.txid}:${input.vout}`);
    }
  }

  return utxos.filter(utxo => !spent.has(`${utxo.txid}:${utxo.outputIndex}`));
}

const MEMPOOL_CHECK_MESSAGE = 'Unable to check pending transactions. Try again before sending.';

const getMempoolFundingInfo = async (systemId, addresses) => {
  try {
    const res = await getAddressMempool(systemId, addresses, undefined, undefined, true);
    if (res.error || !Array.isArray(res.result)) throw new Error(MEMPOOL_CHECK_MESSAGE);
    if (res.result.some(entry => entry == null || typeof entry.spending !== 'boolean' ||
      (entry.spending === true && (typeof entry.txid !== 'string' || entry.txid.length === 0)))) {
      throw new Error(MEMPOOL_CHECK_MESSAGE);
    }

    const txids = [...new Set(res.result.filter(entry => entry.spending).map(entry => entry.txid))];
    const transactions = await Promise.all(txids.map(async txid => {
      const tx = await getTransaction(systemId, txid, 1, true);
      if (tx.error || !tx.result || tx.result.txid !== txid ||
        !Array.isArray(tx.result.vin) || tx.result.vin.length === 0 ||
        tx.result.vin.some(input => input == null || typeof input.txid !== 'string' ||
          input.txid.length === 0 || !Number.isInteger(input.vout) || input.vout < 0)) {
        throw new Error(MEMPOOL_CHECK_MESSAGE);
      }
      return tx.result;
    }));

    return {mempool: res.result, transactions};
  } catch (_) {
    throw new Error(MEMPOOL_CHECK_MESSAGE);
  }
}

export const getMempoolUnspentUtxos = async (systemId, addresses, utxos) => {
  const {mempool, transactions} = await getMempoolFundingInfo(systemId, addresses);
  return excludeMempoolSpentUtxos(utxos, mempool, transactions);
}

const getWalletFundedMempoolOutputs = (systemId, addresses, confirmed, mempool, transactions) => {
  try {
    const fundingAddresses = new Set(addresses);
    const transactionsById = new Map(transactions.map(tx => [tx.txid, tx]));
    const fundedTxids = new Set();
    const confirmedOutpoints = new Set(confirmed.map(utxo => `${utxo.txid}:${utxo.outputIndex}`));

    for (const entry of mempool) {
      if (typeof entry.address !== 'string' || entry.address.length === 0) {
        throw new Error(MEMPOOL_CHECK_MESSAGE);
      }
      // The address index identifies the owner of each spent input, including
      // token-only inputs whose native satoshi delta is zero.
      if (entry.spending && fundingAddresses.has(entry.address)) {
        if (!Number.isInteger(entry.index) || !transactionsById.get(entry.txid)?.vin[entry.index]) {
          throw new Error(MEMPOOL_CHECK_MESSAGE);
        }
        fundedTxids.add(entry.txid);
      }
    }

    const outputs = mempool.filter(entry => !entry.spending).map(entry => {
      if (typeof entry.txid !== 'string' || entry.txid.length === 0 ||
        !Number.isInteger(entry.index) || entry.index < 0 ||
        !Number.isSafeInteger(entry.satoshis) || entry.satoshis < 0) {
        throw new Error(MEMPOOL_CHECK_MESSAGE);
      }
      return {...entry, outputIndex: entry.index};
    });
    const unspent = excludeMempoolSpentUtxos(outputs, mempool, transactions);
    const utxos = [];
    const incoming = [];

    for (const entry of unspent) {
      if (!fundingAddresses.has(entry.address) ||
        confirmedOutpoints.has(`${entry.txid}:${entry.outputIndex}`)) continue;
      if (!fundedTxids.has(entry.txid)) {
        incoming.push(entry);
        continue;
      }

      const tx = transactionsById.get(entry.txid);
      const output = Array.isArray(tx.vout) ? tx.vout[entry.outputIndex] : undefined;
      const scriptPubKey = output?.scriptPubKey;
      if (output?.n !== entry.outputIndex || output.valueSat !== entry.satoshis ||
        typeof scriptPubKey?.hex !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(scriptPubKey.hex) ||
        !Array.isArray(scriptPubKey.addresses) || !scriptPubKey.addresses.includes(entry.address) ||
        ![true, false, 0, 1].includes(scriptPubKey.spendableoutput)) {
        throw new Error(MEMPOOL_CHECK_MESSAGE);
      }
      // This is the same daemon check used for address-index isspendable.
      // In particular, a reserve transfer is not ordinary spendable change.
      if (!scriptPubKey.spendableoutput) continue;

      let unpacked;
      try {
        unpacked = unpackOutput({value: output.valueSat, script: Buffer.from(scriptPubKey.hex, 'hex')}, systemId, true);
      } catch (_) {
        // Match confirmed outputs: unsupported scripts are not funding inputs.
        continue;
      }

      // Address-index currencyvalues use coin units, while unpackOutput uses
      // integer satoshis. Derive reserves from the script, never display names.
      const currencyvalues = {};
      if (unpacked.master != null) {
        for (const [currencyId, value] of Object.entries(unpacked.values)) {
          if (!value.isZero()) currencyvalues[currencyId] = BigNumber(value.toString()).dividedBy(100000000).toNumber();
        }
      }
      utxos.push({
        address: entry.address,
        ...(scriptPubKey.addresses.length > 1 ? {addresses: scriptPubKey.addresses} : {}),
        txid: entry.txid,
        outputIndex: entry.outputIndex,
        script: scriptPubKey.hex,
        satoshis: output.valueSat,
        ...(Object.keys(currencyvalues).length > 0 ? {currencyvalues} : {}),
        isspendable: true,
        height: 0,
      });
    }

    return {utxos, incoming};
  } catch (_) {
    throw new Error(MEMPOOL_CHECK_MESSAGE);
  }
}

const filterSpendableUtxos = (systemId, currency, utxos) => {
  const utxoList = []

  utxos.forEach((inputUtxo) => {
    if (inputUtxo.isspendable && 
      (inputUtxo.satoshis != 0 || 
        (inputUtxo.currencyvalues != null && Object.keys(inputUtxo.currencyvalues).includes(currency))
      )) {
      const _script = Buffer.from(inputUtxo.script, 'hex')
      const _value = inputUtxo.satoshis

      try {
        unpackOutput({ value: _value, script: _script }, systemId, true)
        utxoList.push(inputUtxo)
      } catch (e) {
        console.warn(e.message)
      }
    }
  })

  return utxoList;
}

export const getSpendableUtxosWithMempoolInfo = async (systemId, currency, addresses) => {
  const utxosRes = await getAddressUtxos(systemId, addresses);

  if (utxosRes.error) throw new Error(utxosRes.error.message);

  const confirmed = filterSpendableUtxos(systemId, currency, utxosRes.result);
  const {mempool, transactions} = await getMempoolFundingInfo(systemId, addresses);
  const confirmedUnspent = excludeMempoolSpentUtxos(confirmed, mempool, transactions);
  const pending = getWalletFundedMempoolOutputs(systemId, addresses, utxosRes.result, mempool, transactions);
  const utxosByOutpoint = new Map();
  for (const utxo of [...confirmedUnspent, ...filterSpendableUtxos(systemId, currency, pending.utxos)]) {
    utxosByOutpoint.set(`${utxo.txid}:${utxo.outputIndex}`, utxo);
  }

  return {
    utxos: [...utxosByOutpoint.values()],
    mempoolSpentUtxoCount: confirmed.length - confirmedUnspent.length,
    hasUnconfirmedIncoming: pending.incoming.some(entry => entry.satoshis > 0 ||
      BigNumber(entry.currencyvalues?.[currency] || 0).isGreaterThan(0)),
  };
}

export const getSpendableUtxos = async (systemId, currency, addresses) => {
  const {utxos} = await getSpendableUtxosWithMempoolInfo(systemId, currency, addresses);
  return utxos;
}
