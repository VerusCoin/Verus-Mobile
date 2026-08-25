import { httpsEnabled } from '../proxyServers'
import { isJson } from '../../../../objectManip'
import axios from 'axios';

export const getBlockHeight = (
  proxyServer,
  electrumServer,
  requestOptions = null,
) => {
  return new Promise((resolve, reject) => {
    const address = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/getcurrentblock?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`;
    const request = requestOptions == null
      ? axios.get(address)
      : axios.get(address, requestOptions);

    request
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
