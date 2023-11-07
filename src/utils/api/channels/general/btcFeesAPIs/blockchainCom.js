import { isJson } from '../../../../objectManip'

import axios from 'axios'

export const getBlockchainComBTCFees = () => {
  const address = `https://api.blockchain.com/mempool/fees`

  return new Promise((resolve, reject) => {
    axios.get(address)
    .then((res) => {
      if (!isJson(res.data)) {
        throw new Error("Invalid JSON in blockchainCom.js, received: " + res)
      }

      const response = res.data
      
      resolve({
        fastest: response.priority,
        average: response.regular,
        slowest: response.regular,
      })
    })
    .catch((err) => {
      console.warn(err.message + " in blockchainCom.js")
      resolve(false)
    })
  });
}