//  1. Get protocolVersions from redux store
//  2. If they exist, resolve accordingly
//  3. If they do not, fetch them from http(s) call
//     and update AsyncStorage with function in asyncStore
//  4. Resolve result
import store from '../../../../../store/index';
import { timeout } from '../../../../promises';
import { saveServerVersion } from '../../../../../actions/actionCreators';
import { isJson } from '../../../../objectManip';

import { REQUEST_TIMEOUT_MS } from '../../../../../../env/index'
import axios from 'axios';

const OLD_DEFAULT_VERSION = 1.0

export const getServerVersion = (proxyServer, ip, port, proto, httpsEnabled) => {
  let protocolVersion = store.getState().electrum.serverVersions;

  if (protocolVersion[`${ip}:${port}:${proto}`]) {    
    return new Promise((resolve, reject) => {resolve(protocolVersion[`${ip}:${port}:${proto}`])})
  } 

  return new Promise((resolve, reject) => {
    let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/server/version?port=${port}&ip=${ip}&proto=${proto}`

    axios.get(httpAddr)
    .then((res) => {
      if (!isJson(res.data)) {
        throw new Error("Invalid JSON in getServerVersion.js, received: " + res)
      }

      const response = res.data

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

      } else if (response.msg === "error" && response.result.message) {
        throw new Error(response.result.message)
      } else {
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