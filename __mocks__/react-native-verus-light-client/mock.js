const {
  createWallet,
  openWallet,
  closeWallet,
  deleteWallet,
  request
} = require('./WalletFolder')

function mockVerusLightClient() {
  return {
    createWallet,
    openWallet,
    closeWallet,
    deleteWallet,
    request
  } 
}

module.exports = mockVerusLightClient