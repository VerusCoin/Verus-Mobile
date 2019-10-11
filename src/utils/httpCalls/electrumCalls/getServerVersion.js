//  1. Get protocolVersions from redux store
//  2. If they exist, resolve accordingly
//  3. If they do not, fetch them from http(s) call
//     and update AsyncStorage with function in asyncStore
//  4. Resolve result
import store from '../../../store/index';
import { timeout } from '../../../utils/promises';
import { saveServerVersion } from '../../../actions/actionCreators';
import { isJson } from '../../objectManip'

const OLD_DEFAULT_VERSION = 1.0

export const getServerVersion = (proxyServer, ip, port, proto, httpsEnabled) => {
  let protocolVersion = store.getState().electrum.serverVersions;

  if (protocolVersion[`${ip}:${port}:${proto}`]) {    
    return new Promise((resolve, reject) => {resolve(protocolVersion[`${ip}:${port}:${proto}`])})
  } 

  return new Promise((resolve, reject) => {
    let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/server/version?port=${port}&ip=${ip}&proto=${proto}`

    timeout(global.REQUEST_TIMEOUT_MS, fetch(httpAddr, {method: 'GET'}))
    .then((response) => {
      if (!isJson(response)) {
        throw new Error("Invalid JSON in getServerVersion.js, received: " + response)
      }

      return response.json()
    })
    .then((response) => {
      if (response.msg === "success" &&
        response.result &&
        (typeof response.result === 'object' || typeof response.result === 'string')) {

        if (typeof response.result === 'object' &&
          response.result.length === 2 &&
          response.result[0].indexOf('ElectrumX') > -1 &&
          Number(response.result[1])) {
          return Number(response.result[1])
        } else {
          //Older electrum servers don't have version number, they only return "ElectrumX"
          return OLD_DEFAULT_VERSION
        }

      } else if (response.msg === "error" && result.message) {
        throw new Error(result.message)
      } else {
        console.log(response)
        throw new Error("Network error in getServerVersion.js")
      }
    })
    .then((version) => {
      if (!isNaN(version)) {
        return Promise.all([version, saveServerVersion(`${ip}:${port}:${proto}`, version, store.dispatch)])
      } else {
        throw new Error("Expected version number getServerVersion.js, got " + typeof version + " instead")
      }
    })
    .then(arr => {
      resolve(arr[0])
    })
    .catch((err) => {
      console.warn(err.message + " in getServerVersion.js")
      reject(err)
    })
  })
}