import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

export const getAtomicExplorerBTCFees = () => {
  const address = `https://www.atomicexplorer.com/api/btc/fees`

  return new Promise((resolve, reject) => {
    timeout(global.REQUEST_TIMEOUT_MS, fetch(address, {method: 'GET'}))
    .then((response) => {
      if (!isJson(response)) {
        throw new Error("Invalid JSON in atomicExplorer.js, received: " + response)
      }

      return response.json()
    })
    .then((response) => {
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