import { httpsEnabled } from '../proxyServers'

export const getBlockHeight = (proxyServer, electrumServer) => {
  return new Promise((resolve, reject) => {
    fetch(`${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/getcurrentblock?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`, {
      method: 'GET'
    })
    .then((response) => response.json())
    .then((response) => {
      resolve(response)
    })
    .catch((err) => {
      reject(err)
    })
  });
}