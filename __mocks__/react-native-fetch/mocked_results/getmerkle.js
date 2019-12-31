const merkle_roots = require('./blockchain_data').merkle_roots

/**
 * The mock for getmerkle. This function searches through the mock merkle root list, and returns a merkle root if it is found.
 * @param {Integer} height The blockheight of the utxo to fetch merkle hashes for.
 * @param {String} txid The txid string of the transaction to fetch merkle hashes for.
 */
const getmerkle_mock = function(height, txid) {
  if (merkle_roots.hasOwnProperty(`${txid}-${height}`)) return merkle_roots[`${txid}-${height}`]

  return {"code":1,"message":`${txid} should be a transaction hash`}
}


module.exports = getmerkle_mock