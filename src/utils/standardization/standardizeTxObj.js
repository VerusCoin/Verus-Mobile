// Makes transaction objects from lightwalletd client resemble those from electrum,
// for predictable, standard behaviour
export const standardizeDlightTxObj = (txObj) => {
  const { address, amount, category, height, status, time, txid } = txObj
  return {
    address,
    amount,
    type: category,
    height,
    status,
    timestamp: time,
    txid
  }
}