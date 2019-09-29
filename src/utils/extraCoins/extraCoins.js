const extraCoins = require('./cryptocurrencies.json');

module.exports = extraCoins;
module.exports.symbols = () => Object.keys(extraCoins);

