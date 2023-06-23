export * from './requests/getBlockHeight';
export * from './requests/getBalances';
export * from './requests/getTransactions';
export * from './requests/getTransaction';
export * from './requests/getBlockInfo';
export * from './requests/getUnspent';
export * from './requests/getMerkle';
export * from './requests/pushTx';
export * from './requests/getServerVersion';

import { proxyServers, httpsEnabled } from './proxyServers';
import { getGoodServer, testProxy, testElectrum } from './serverTester';
import { getServerVersion } from './requests/getServerVersion';
import { updateParamObj } from '../../../electrumUpdates';
import { networks } from 'bitgo-utxo-lib';
import { isJson } from '../../../objectManip'
import ApiException from '../../errors/apiError';
import { ELECTRUM } from '../../../constants/intervalConstants'
import axios from 'axios';

// This purpose of this method is to take in a list of electrum servers,
// and use a valid one to call a specified command given a set of parameters
// It first chooses a proxy server at random, then find out which electrum
// servers are working by attempting to call getBlockHeight on each of them.
// It then calls the specified command with the specified params (passed in as an object)
// on that electrum server with an HTTP get
export const getElectrum = async (coinObj, callType, params, toSkip) => {
  const serverList = coinObj.electrum_endpoints
  const coinID = coinObj.id

  const proxyServer = (await getGoodServer(testProxy, proxyServers)).goodServer
  let goodServerRes = null

  if (toSkip) {
    let _serverList = serverList.filter((server) => {
      return !toSkip.includes(server)
    })

    goodServerRes = await getGoodServer(testElectrum, _serverList, [
      proxyServer,
    ]);
  }

  const proxyIndex = serverList.findIndex(server => server.split(":")[0] === proxyServer)

  if (goodServerRes == null) {
    goodServerRes = await getGoodServer(
      testElectrum,
      serverList,
      [proxyServer],
      proxyIndex !== -1 ? proxyIndex : null
    );
  }

  let electrumSplit = goodServerRes.goodServer.split(":")
  let goodServer = {
    ip: electrumSplit[0],
    port: electrumSplit[1],
    proto: electrumSplit[2],
  }

  const resultObj = { goodServer: goodServer, blockHeight: goodServerRes.testResult.result }
  
  let eServer = resultObj.goodServer

  resultObj.electrumVersion = await getServerVersion(proxyServer, eServer.ip, eServer.port, eServer.proto, httpsEnabled)

  let electrumServer = resultObj.goodServer
  let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`

  updateParamObj(
    params,
    networks[coinID.toLowerCase()] ? networks[coinID.toLowerCase()] : networks['default'],
    resultObj.electrumVersion)

  for (let key in params) {
    httpAddr += `&${key}=${params[key]}`
  }

  const res = await axios.get(httpAddr)

  if (!isJson(res.data)) {
    throw new Error("Invalid JSON in callCreators.js, received: " + res)
  }

  return {
    result: res.data.result,
    blockHeight: resultObj.blockHeight,
    electrumUsed: resultObj.goodServer,
    electrumVersion: resultObj.electrumVersion
  }
}

//Function to update only if values have changed
export const electrumRequest = async (coinObj, callType, params, toSkip) => {
  try {
    const response = await getElectrum(coinObj, callType, params, toSkip)

    return !response ? false : {coin: coinObj.id, ...response}
  } catch(err) {
    console.warn(err)
      
    throw new ApiException(
      err.name,
      err.message,
      coinObj.id,
      ELECTRUM,
      err.code
    )
  }
}

export const postElectrum = (serverList, callType, data, toSkip) => {
  let proxyServer

  return new Promise((resolve, reject) => {
    //Get working proxy server
    getGoodServer(testProxy, proxyServers)
    .then((_proxyServer) => {
      proxyServer = _proxyServer.goodServer

      if (toSkip) {
        let _serverList = serverList.filter((server) => {
          return !toSkip.includes(server)
        })

        return getGoodServer(testElectrum, _serverList, [proxyServer])
      }

      return getGoodServer(testElectrum, serverList, [proxyServer], toSkip)
    })
    .then((result) => {
      let electrumSplit = result.goodServer.split(":")
      let goodServer = {
        ip: electrumSplit[0],
        port: electrumSplit[1],
        proto: electrumSplit[2],
      }

      resultObj = { goodServer: goodServer, blockHeight: result.testResult.result }
      return resultObj
    })
    .then((resultObj) => {
      let electrumServer = resultObj.goodServer
      let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}`
      let promiseArray = []
      let bodyObj = {
        port: electrumServer.port,
        ip: electrumServer.ip,
        proto: electrumServer.proto,
      }

      for (let key in data) {
        bodyObj[key] = data[key]
      }

      promiseArray.push(axios.post(httpAddr, bodyObj, {
        headers: {
          "Content-type": "application/json",
        }
      }))

      promiseArray.push(resultObj.blockHeight)
      promiseArray.push(resultObj.goodServer)

      return Promise.all(promiseArray)
    })
    .then((responseArray) => {
      if (!isJson(responseArray[0].data)) {
        throw new Error("Invalid JSON in callCreators.js, received: " + responseArray[0])
      }

      responseArray[0] = responseArray[0].data

      return Promise.all(responseArray)
    })
    .then((responseArray) => {
      let resultObj = {result: responseArray[0].result, blockHeight: responseArray[1], electrumUsed: responseArray[2]}

      resolve(resultObj)
    })
  });
}


