export const timeout = (ms, promise) => {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject(new Error("Network request timed out"))
    }, ms)
    promise.then(resolve, reject)
  })
}