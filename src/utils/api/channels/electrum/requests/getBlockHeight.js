import { httpsEnabled } from '../proxyServers'
import { isJson } from '../../../../objectManip'

export const getBlockHeight = (proxyServer, electrumServer) => {
  return new Promise((resolve, reject) => {
    fetch(`${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/getcurrentblock?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`, {
      method: 'GET'
    })
    .then((response) => {
      if (!isJson(response)) {
        throw new Error("Invalid JSON in getBlockHeight.js, received: " + response)
      }

      return response.json()
    })
    .then((response) => {
      resolve(response)
    })
    .catch((err) => {
      reject(err)
    })
  });
}