export const getAtomicExplorerBTCFees = () => {
  const address = `https://www.atomicexplorer.com/api/btc/fees`

  return new Promise((resolve, reject) => {
    fetch(address, {
      method: 'GET'
      })
    .then((response) => response.json())
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
  });
}