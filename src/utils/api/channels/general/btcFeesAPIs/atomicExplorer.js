import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

import { REQUEST_TIMEOUT_MS } from '../../../../../../env/index'
import axios from 'axios'

export const getAtomicExplorerBTCFees = () => {
  const address = `https://www.atomicexplorer.com/api/btc/fees`

  return new Promise((resolve, reject) => {
    axios.get(address)
    .then((res) => {
      if (!isJson(res.data)) {
        throw new Error("Invalid JSON in atomicExplorer.js, received: " + res)
      }

      const response = res.data
      
      if (response.msg !== "success") {
        resolve(false)
      }
      else {
        resolve({
          fastest: Number(response.result.recommended.fastestFee),
          average: Number(response.result.recommended.halfHourFee),
          slowest: Number(response.result.recommended.hourFee)
        })
      }
    })
    .catch((err) => {
      console.warn(err.message + " in atomicExplorer.js")
      resolve(false)
    })
  });
}