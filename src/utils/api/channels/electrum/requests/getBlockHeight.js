import { httpsEnabled } from '../proxyServers'
import { isJson } from '../../../../objectManip'
import axios from 'axios';

export const getBlockHeight = (proxyServer, electrumServer) => {
  return new Promise((resolve, reject) => {
    axios.get(`${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/getcurrentblock?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`)
    .then((response) => {
      if (!isJson(response.data)) {
        throw new Error("Invalid JSON in getBlockHeight.js, received: " + response)
      }

      resolve(response.data)
    })
    .catch((err) => {
      reject(err)
    })
  });
}