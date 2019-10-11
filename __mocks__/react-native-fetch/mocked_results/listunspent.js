const unspent_utxos = require('./blockchain_data').unspent_utxos

/**
 * Mocks an electrum call to listunspent, and returns a specified number
 * of unspent UTXOs
 * @param {Integer} num_utxos The number of unspent utxos to return
 */
const listunspent_mock = function(num_utxos) {
  let returned_utxos = []
  for (let i = 0; i < num_utxos; i++) {
    returned_utxos.push(unspent_utxos[Math.round(Math.random() * (unspent_utxos.length - 1))])
  }

  return returned_utxos
}

module.exports = listunspent_mock
