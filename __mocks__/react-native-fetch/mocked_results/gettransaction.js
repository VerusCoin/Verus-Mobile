const gotten_utxos = require('./blockchain_data').gotten_utxos

/**
 * The mock for gettransaction. This function searches through the mock UTXO list, and returns a transaction hash if it is found.
 * @param {String} txid The txid string of the transaction to get. If found in the mock UTXO list, its hash will be returned.
 */
const gettransaction_mock = function(txid) {
  if (gotten_utxos.hasOwnProperty(txid)) return gotten_utxos[txid]

  return { status: 'not found' }
}

module.exports = gettransaction_mock