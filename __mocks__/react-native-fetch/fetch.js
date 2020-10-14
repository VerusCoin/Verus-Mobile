const mocked_results = require('./mocked_results/mocked_results.js')
const {
  MOCK_PROXY_URL,
  FIAT_EXCHANGE_RATES_URL,
  VERUS_RATE_URL
} = require("./util/mock_urls");

/**
 * Mock of the react-native-fetch http call function. If the URL is an electrum string,
 * it will parse the electrum data, and use it to return mock electrum data. Possible
 * electrum servers follow the format status:<success||fail>-code:<result code>-eproto:<electrum protocol version>-params:<stringified parameter object to pass to mock function>
 * @param {String} url The full URL to fetch. Test commands should be included in here
 * @param {Object} payload Fetch type, body, headers etc.
 */
const fetch = async function(url, payload) {
  if (url.endsWith(MOCK_PROXY_URL)) {
    return new Promise((resolve) => (resolve({status: 200})))
  } else if (url === FIAT_EXCHANGE_RATES_URL) {
    return new Promise(resolve =>
      resolve({
        json: () => {
          return {
            rates: {
              CAD: 1.4383752203,
              HKD: 7.7558193453,
              ISK: 140.4989335064,
              PHP: 51.4003524066,
              DKK: 6.9281276083,
              HUF: 326.7458035797,
              CZK: 25.6283038116,
              GBP: 0.862190485,
              RON: 4.4960586108,
              SEK: 10.2675507744,
              IDR: 16574.9976815358,
              INR: 76.1620142817,
              BRL: 5.0683483261,
              RUB: 79.8293610313,
              HRK: 7.053695632,
              JPY: 110.4609106928,
              THB: 32.8646944264,
              CHF: 0.982101456,
              EUR: 0.9273856997,
              MYR: 4.4449596587,
              BGN: 1.8137809515,
              TRY: 6.5859222851,
              CNY: 7.0838356673,
              NOK: 11.3667810442,
              NZD: 1.7563757767,
              ZAR: 17.6333116943,
              USD: 1.0,
              MXN: 24.6805156264,
              SGD: 1.4601687842,
              AUD: 1.7236390615,
              ILS: 3.6698506909,
              KRW: 1256.7003616804,
              PLN: 4.2711675786
            },
            base: "USD",
            date: "2020-03-23"
          };
        }
      })
    );
  } else if (url === VERUS_RATE_URL) {
    return new Promise(resolve =>
      resolve({
        json: () => {
          return [
            {
              time_open: "2020-03-23T00:00:00Z",
              time_close: "2020-03-23T23:59:59Z",
              open: 0.04124622,
              high: 0.04778287,
              low: 0.04079799,
              close: 0.04778287,
              volume: 192,
              market_cap: 2109261
            }
          ];
        }
      })
    );
  }

  const original_ip_regex = /\/{1}[^\/\n]+?\//
  const url_ip = url.match(original_ip_regex)[0].slice(1,-1)

  if (url_ip == MOCK_PROXY_URL) {
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