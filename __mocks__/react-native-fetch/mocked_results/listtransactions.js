const transaction_list = require('./blockchain_data').transaction_list

/**
 * Mocks an electrum call to listtransactions, and returns a specified number
 * of transactions
 * @param {Integer} num_txs The number of txs to return
 */
const listtransactions_mock = function(num_txs) {
  let returned_txs = []
  for (let i = 0; i < num_txs; i++) {
    returned_txs.push(transaction_list[Math.round(Math.random() * (transaction_list.length - 1))])
  }

  return returned_txs
}

module.exports = listtransactions_mock
