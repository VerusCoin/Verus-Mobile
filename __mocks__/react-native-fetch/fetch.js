const mocked_results = require('./mocked_results/mocked_results.js')
const DEFAULT_ELECTRUM_SERVER_VERSION = ["ElectrumX"]

/**
 * Mock of the react-native-fetch http call function. If the URL is an electrum string,
 * it will parse the electrum data, and use it to return mock electrum data. Possible
 * electrum servers follow the format status:<success||fail>-code:<result code>-eproto:<electrum protocol version>-params:<stringified parameter object to pass to mock function>
 * @param {String} url The full URL to fetch. Test commands should be included in here
 * @param {Object} payload Fetch type, body, headers etc.
 */
const fetch = function(url, payload) {

  if (url.endsWith('mock.proxy.server')) {
    return new Promise((resolve) => (resolve({status: 200})))
  }

  const original_ip_regex = /\/{1}[^\/\n]+?\//
  const url_ip = url.match(original_ip_regex)[0].slice(1,-1)

  if (url_ip == 'mock.proxy.server') {
    const url_params_regex = /&[^\/\n]+?$/
    const electrum_cmd_regex = /api\/{1}[^\n]+?\?/
    const electrum_cmd = url.match(electrum_cmd_regex)[0].slice(4,-1).replace('/', '_')
    const electrum_params = url.match(url_params_regex)[0].slice(1).split('&')
    let params_obj = {}

    electrum_params.map((param) => {
      const param_split = param.split('=')
      params_obj[param_split[0]] = param_split[1]
    })

    return new Promise((resolve) => {
      const test_params = JSON.parse(params_obj.ip.replace(/\|/g, ':'))
      const mock_function = mocked_results[electrum_cmd]

      if (test_params.success) {
        if (test_params.params[electrum_cmd] == null) throw new Error(`No params specified for ${electrum_cmd} command. Please include them when calling mock fetch, or set them to [] to use the commands passed to the function.`)
        else if (test_params.params[electrum_cmd].length === 0) {
          //If params are left empty, call mock function with default supplied params sorted in alphabetical order by their key names
          delete params_obj.ip
          delete params_obj.port
          delete params_obj.proto

          let supplied_params = Object.keys(params_obj).sort()
          supplied_params = supplied_params.map((value_key) => params_obj[value_key])

          resolve({json: () => {return {msg: 'success', result: mock_function(...supplied_params)}}})
        } else resolve({json: () => {return {msg: 'success', result: mock_function(...test_params.params[electrum_cmd])}}})
      } else {
        resolve({json: () => {return {msg: 'error', result: `code ${test_params.code}: ${test_params.error_msg}`}}})
      }
    })
  } else {
    throw new Error("Test fetch function called with incompatible mock parameters, try using the real fetch function.")
  }
}

module.exports = fetch