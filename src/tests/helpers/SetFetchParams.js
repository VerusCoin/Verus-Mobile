/**
 * This function returns an electrum server string or object to be parsed by the jest 'fetch' mock function. The fetch result will
 * depend on the inputs here.
 * @param {Boolean} success Whether or not the call succeeds.
 * @param {Integer} code What http code the call returns with.
 * @param {Object} params The object that holds multiple different electrum calls and their paramters, e.g. {server_version: ["ElectrumX 13.0.8", 1.4], getcurrentblock: [140322]}.
 * Refer to __mocks__/react-native-fetch/mocked_results to see all the possible commands and parameters for them.
 * @param {String} error_msg (Optional) Error message returned if the call fails with an error.
 * @param {Boolean} format_server (Optional, default = false) Determines if the test servers will be returned in formatted {ip:<>, port:<>, proto:<>}
 * format, or if they will be returned as an array of server strings. Default is array of server strings.
 */
export const setFetchParams = (success, code, params = {}, format_server = false, error_msg = '') => {
  const ip_obj = {
    success,
    code,
    params,
    format_server,
    error_msg
  }

  
  const test_server_ip = JSON.stringify(ip_obj).replace(/:/g, '|')
  return format_server ? {ip: test_server_ip, port: 12345, proto: 'tcp'} : [`${test_server_ip}:12345:tcp`, `${test_server_ip}:12345:tcp`]
}