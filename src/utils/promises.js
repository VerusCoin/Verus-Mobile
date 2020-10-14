export const timeout = (ms, promise) => {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject(new Error("Network request timed out"))
    }, ms)
    promise.then(resolve, reject).catch(err => {
      reject(err)
    })
  })
}

/**
 * Takes in an array of promises and resolves them sequentially, returning a promise that
 * resolves with an array of promise resolutions (or rejections). Any non-promise types 
 * in the array are left alone in their index for the return array.
 * @param {Array} promises An array of any type
 */
export const resolveSequentially = (promises) => {
	return promises.reduce((accumulator, promise) => {
		return accumulator.then(arr => {
    	if (!promise.then) return arr.concat(promise)
			return promise.then(res => {
      	return arr.concat(res)
      })
		})
	},
  Promise.resolve([]))
}