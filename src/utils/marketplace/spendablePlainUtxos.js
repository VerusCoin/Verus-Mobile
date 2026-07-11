/* eslint-disable import/prefer-default-export */
/**
 * Confirmed plain-P2PKH UTXO selection that is safe against mempool double
 * spends. getaddressutxos only reflects the confirmed chain: outputs already
 * spent by a transaction still sitting in the mempool (e.g. a listing this
 * wallet published seconds ago) are still reported as unspent, and reusing
 * one gets the next broadcast rejected by the network. getaddressmempool
 * marks those spends with prevtxid/prevout, so they are excluded here.
 *
 * Returns { utxos, hasPendingSpends } — utxos sorted largest-first, and
 * hasPendingSpends true when the mempool is spending from this address
 * (useful for a clearer error when the remaining balance is short).
 */
export async function getSpendablePlainUtxos(endpoint, address) {
  const utxoRes = await endpoint.getAddressUtxos({ addresses: [address] });
  const plain = ((utxoRes && utxoRes.result) || [])
    .filter((u) => u.satoshis > 0 && u.script && u.script.startsWith('76a914'));

  const spentInMempool = new Set();
  try {
    const memRes = await endpoint.getAddressMempool({ addresses: [address] });
    ((memRes && memRes.result) || []).forEach((delta) => {
      if (delta.satoshis < 0 && delta.prevtxid != null && delta.prevout != null) {
        spentInMempool.add(`${delta.prevtxid}:${delta.prevout}`);
      }
    });
  } catch (e) {
    // Mempool index unavailable: fall back to the confirmed view rather than
    // blocking the action outright.
    console.warn('[marketplace] getAddressMempool failed:', e && e.message);
  }

  const utxos = plain
    .filter((u) => !spentInMempool.has(`${u.txid}:${u.outputIndex}`))
    .sort((a, b) => b.satoshis - a.satoshis);

  return { utxos, hasPendingSpends: spentInMempool.size > 0 };
}
