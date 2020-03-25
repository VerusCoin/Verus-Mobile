const formatResponse = require('./JsonRpc')

function getPrivateBalance(id, params) {
  return new Promise((resolve, reject) => {
    if (params.length > 0) {
      formatResponse(id, null, {
        data:
          "getprivatebalance expected 0 params, received " + params,
        message: "Invalid Parameters",
        code: -32602
      })
    } else resolve(formatResponse(id, {total: 30, confirmed: 20}, null))
  })
}

function getInfo(id, params) {
  return new Promise((resolve, reject) => {
    if (params.length > 0) {
      formatResponse(id, null, {
        data:
          "getprivatebalance expected 0 params, received " + params,
        message: "Invalid Parameters",
        code: -32602
      })
    } else resolve(formatResponse(id, {"status": "scanning", "percent": 100, "longestchain": 839172, "blocks": 839172}, null))
  })
}

function getTransactions(id, params) {
  return new Promise((resolve, reject) => {
    if (params.length > 1) {
      formatResponse(id, null, {
        data: "getprivatebalance expected max 1 param, received " + params,
        message: "Invalid Parameters",
        code: -32602
      });
    } else
      resolve(
        formatResponse(
          id,
          [
            {
              address: null,
              amount: 12.160704,
              category: "sent",
              status: "confirmed",
              time: "341431",
              txid: "3242edc2c2",
              height: "312312"
            },
            {
              address: "2ei2joffd2",
              amount: 4,
              category: "sent",
              status: "confirmed",
              time: "341431",
              txid: "3242edc2c2",
              height: "312312"
            },
            {
              address: "2ei2joffd2",
              amount: 1,
              category: "sent",
              status: "confirmed",
              time: "341431",
              txid: "3242edc2c2",
              height: "312312"
            },
            {
              address: "2ei2joffd2",
              amount: 2.4532,
              category: "sent",
              status: "confirmed",
              time: "341431",
              txid: "3242edc2c2",
              height: "312312"
            }
          ],
          null
        )
      );
  })
}

const requestFunctions = {
  ['getprivatebalance']: getPrivateBalance,
  ['listprivatetransactions']: getTransactions,
  ['getinfo']: getInfo
}

module.exports = requestFunctions