export * from './electrumCalls/getBlockHeight';
export * from './electrumCalls/getBalances';
export * from './electrumCalls/getTransactions';
export * from './electrumCalls/getTransaction';
export * from './electrumCalls/getBlockInfo';
export * from './electrumCalls/getUnspent';
export * from './electrumCalls/getMerkle';
export * from './electrumCalls/pushTx';
export * from './electrumCalls/getServerVersion';

import { proxyServers, httpsEnabled } from './proxyServers';
import { getGoodServer, testProxy, testElectrum } from './serverTester';
import { getCoinPaprikaRate } from '../general/ratesAPIs/coinPaprika';
import { getAtomicExplorerBTCFees } from '../general/btcFeesAPIs/atomicExplorer';
import { truncateDecimal } from '../../../math';
import { timeout } from '../../../promises';
import { getServerVersion } from './electrumCalls/getServerVersion';
import { updateParamObj } from '../../../electrumUpdates';
import { networks } from 'bitgo-utxo-lib';
import { isJson } from '../../../objectManip'
import ApiException from '../../errors/apiError';
import { ELECTRUM } from '../../../constants/intervalConstants'

// This purpose of this method is to take in a list of electrum servers,
// and use a valid one to call a specified command given a set of parameters
// It first chooses a proxy server at random, then find out which electrum
// servers are working by attempting to call getBlockHeight on each of them.
// It then calls the specified command with the specified params (passed in as an object)
// on that electrum server with an HTTP get
export const getElectrum = (serverList, callType, params, toSkip, coinID) => {
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

      return getGoodServer(testElectrum, serverList, [proxyServer])
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
    .then((serverObj) => {
      let eServer = serverObj.goodServer
      return Promise.all([serverObj, getServerVersion(proxyServer, eServer.ip, eServer.port, eServer.proto, httpsEnabled)])
    })
    .then((resultArr) => {
      let resultObj = resultArr[0]
      resultObj.electrumVersion = resultArr[1]

      let electrumServer = resultObj.goodServer
      let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`
      let promiseArray = []

      updateParamObj(
        params, 
        networks[coinID.toLowerCase()] ? networks[coinID.toLowerCase()] : networks['default'], 
        resultObj.electrumVersion)

      for (let key in params) {
        httpAddr += `&${key}=${params[key]}`
      }

      promiseArray.push(
        fetch(httpAddr, {
        method: 'GET'
        }))

      promiseArray.push(resultObj.blockHeight)
      promiseArray.push(resultObj.goodServer)
      promiseArray.push(resultObj.electrumVersion)

      return Promise.all(promiseArray)
    })
    .then((responseArray) => {
      if (!isJson(responseArray[0])) {
        throw new Error("Invalid JSON in callCreators.js, received: " + responseArray[0])
      }
      
      responseArray[0] = responseArray[0].json()
      
      return Promise.all(responseArray)
    })
    .then((responseArray) => {
      let resultObj = {
        result: responseArray[0].result, 
        blockHeight: responseArray[1], 
        electrumUsed: responseArray[2], 
        electrumVersion: responseArray[3]}
      resolve(resultObj)
    })
    .catch(err => {
      reject(err)
    })
  });
}

//Function to update only if values have changed
export const updateValues = (oldResponse, serverList, callType, params, coinID, toSkip) => {
  return new Promise((resolve, reject) => {
    timeout(global.REQUEST_TIMEOUT_MS, getElectrum(serverList, callType, params, toSkip, coinID))
    .then((response) => {
      if(response === oldResponse) {
        resolve({
          coin: coinID,
          result: oldResponse,
          new: false,
          blockHeight: response.blockHeight,
          electrumUsed: response.electrumUsed,
          electrumVersion: response.electrumVersion,
          error: false
        })
      } else if (response === false) {
        resolve(false)
      } else {
        resolve({
          coin: coinID,
          result: response,
          new: true,
          blockHeight: response.blockHeight,
          electrumUsed: response.electrumUsed,
          electrumVersion: response.electrumVersion,
          error: false
        })
      }
    })
    .catch((err) => {
      reject(err)
    })
  });
}

//Function to update only if values have changed
export const electrumRequest = (serverList, callType, params, coinID, toSkip) => {
  return new Promise((resolve, reject) => {
    timeout(global.REQUEST_TIMEOUT_MS, getElectrum(serverList, callType, params, toSkip, coinID))
    .then((response) => {
      resolve(!response ? false : {coin: coinID, ...response})
    })
    .catch((err) => {
      console.warn(err)
      
      reject(new ApiException(
        err.name,
        err.message,
        coinID,
        ELECTRUM,
        err.code
      ))
    })
  });
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

      console.log("Posting request to electrum server")
      promiseArray.push(
        fetch(httpAddr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyObj)
        }))

      promiseArray.push(resultObj.blockHeight)
      promiseArray.push(resultObj.goodServer)

      return Promise.all(promiseArray)
    })
    .then((responseArray) => {
      if (!isJson(responseArray[0])) {
        throw new Error("Invalid JSON in callCreators.js, received: " + responseArray[0])
      }

      responseArray[0] = responseArray[0].json()
      console.log("Received response from push to electrum")

      return Promise.all(responseArray)
    })
    .then((responseArray) => {
      let resultObj = {result: responseArray[0].result, blockHeight: responseArray[1], electrumUsed: responseArray[2]}

      resolve(resultObj)
    })
  });
}


