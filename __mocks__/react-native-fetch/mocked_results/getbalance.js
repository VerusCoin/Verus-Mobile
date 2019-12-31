/**
 * This returns a getbalance result based on the supplied confirmed and unconfirmed balances
 * @param {Number} confirmed Confirmed balance to return 
 * @param {Number} unconfirmed Unconfirmed balance to return
 */
const getbalance_mock = function(confirmed, unconfirmed) {
  return {confirmed, unconfirmed}
}

module.exports = getbalance_mock