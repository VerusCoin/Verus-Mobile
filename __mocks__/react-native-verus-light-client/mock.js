const {
  createWallet,
  openWallet,
  closeWallet,
  deleteWallet,
  request,
  startSync,
  stopSync
} = require('./WalletFolder')

function mockVerusLightClient() {
  return {
    createWallet,
    openWallet,
    closeWallet,
    deleteWallet,
    startSync,
    stopSync,
    request
  } 
}

module.exports = mockVerusLightClient