const requestFunctions = require('./requests/WalletRequests')
const formatResponse = require('./requests/JsonRpc')

const WalletFolder = {}

function createWallet(coinId, coinProto, accountHash, address, port, numAddresses, seed, birthday) {
  WalletFolder[coinId + '_' + coinProto + '_' + accountHash] = { open: false }

  return new Promise((resolve, reject) => resolve(true))
}

function openWallet(coinId, coinProto, accountHash) {
  return new Promise((resolve, reject) => {
    if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) reject("Failed to open " + coinId + " wallet.")
    else {
      WalletFolder[coinId + '_' + coinProto + '_' + accountHash].open = true

      resolve(true)
    }
  })
}

function startSync(coinId, coinProto, accountHash) {
  return new Promise((resolve, reject) => {
    if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) reject("Failed to open " + coinId + " wallet.")
    else {
      WalletFolder[coinId + '_' + coinProto + '_' + accountHash].open = true

      resolve(true)
    }
  })
}

function stopSync(coinId, coinProto, accountHash) {
  return new Promise((resolve, reject) => {
    if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) reject("Failed to open " + coinId + " wallet.")
    else {
      WalletFolder[coinId + '_' + coinProto + '_' + accountHash].open = true

      resolve(true)
    }
  })
}

function closeWallet(coinId, coinProto, accountHash) {
  return new Promise((resolve, reject) => {
    if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) reject("Failed to close " + coinId + " wallet.")
    else {
      WalletFolder[coinId + '_' + coinProto + '_' + accountHash].open = false
      resolve(true)
    }
  })
}

function deleteWallet(coinId, coinProto, accountHash) {
  return new Promise((resolve, reject) => {
    if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) reject("Failed to delete " + coinId + " wallet.")
    else {
      delete WalletFolder[coinId + '_' + coinProto + '_' + accountHash]
      resolve(true)
    }
  })
}

function request(id, method, params) {
  const coinId = params[0]
  const coinProto = params[1]
  const accountHash = params[2]

  return new Promise((resolve, reject) => {
    if (params.length < 3) {
      resolve(
        formatResponse(id, null, {
          data:
            "CoinID (ticker), account hash, and coin protocol not specified in parameter array.",
          message: "Invalid Parameters",
          code: -32602
        })
      );
    }
    else if (WalletFolder[coinId + '_' + coinProto + '_' + accountHash] == null) {
      resolve(
        formatResponse(id, null, {
          data:
            coinId + " wallet not yet added, or failed to activate.",
          message: "Invalid Parameters",
          code: -32602
        })
      );
    }
    else if (requestFunctions[method] == null) {
      resolve(
        formatResponse(id, null, {
          data:
            method + " is not a valid method",
          message: "Invalid Request",
          code: -32600
        })
      );
    } else {
      requestFunctions[method](id, params.slice(3)).then(res => {
        resolve(res)
      })
    }
  })
}

module.exports = {
  createWallet,
  openWallet,
  closeWallet,
  deleteWallet,
  startSync,
  stopSync,
  request
}
