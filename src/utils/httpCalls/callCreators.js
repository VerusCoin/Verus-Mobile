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
import { getCoinPaprikaRate } from './ratesAPIs/coinPaprika';
import { getAtomicExplorerBTCFees } from './btcFeesAPIs/atomicExplorer';
import { truncateDecimal } from '../math';
import { timeout } from '../promises';
import { getServerVersion } from './electrumCalls/getServerVersion';
import { updateParamObj } from '../electrumUpdates';
import { networks } from 'bitgo-utxo-lib';
import { isJson } from '../objectManip'

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
      resultObj.serverVersion = resultArr[1]

      let electrumServer = resultObj.goodServer
      let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`
      let promiseArray = []

      updateParamObj(
        params, 
        networks[coinID.toLowerCase()] ? networks[coinID.toLowerCase()] : networks['default'], 
        resultObj.serverVersion)

      for (let key in params) {
        httpAddr += `&${key}=${params[key]}`
      }

      promiseArray.push(
        fetch(httpAddr, {
        method: 'GET'
        }))

      promiseArray.push(resultObj.blockHeight)
      promiseArray.push(resultObj.goodServer)
      promiseArray.push(resultObj.serverVersion)

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
        serverUsed: responseArray[2], 
        serverVersion: responseArray[3]}
      resolve(resultObj)
    })
    .catch(err => {
      console.log(`Error while trying to make call: ${callType}`)
      console.warn(err.message)
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
          serverUsed: response.serverUsed,
          serverVersion: response.serverVersion,
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
          serverUsed: response.serverUsed,
          serverVersion: response.serverVersion,
          error: false
        })
      }
    })
    .catch((err) => {
      reject(err)
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
      let resultObj = {result: responseArray[0].result, blockHeight: responseArray[1], serverUsed: responseArray[2]}

      resolve(resultObj)
    })
  });
}

export const getCoinRate = (coinObj) => {
  //This is to be added to later
  let rateFunctions = [getCoinPaprikaRate(coinObj)]

  return new Promise((resolve, reject) => {
    Promise.all(rateFunctions)
    .then((rates) => {
      let index = 0

      while (index < rates.length && rates[index] === false) {
        index++
      }
      if (index < rates.length) {
        let resolveObj = {id: coinObj.id, rate: rates[index]}
        resolve(resolveObj)
      }
      else {
        resolve(false)
      }
    })
  });
}

export const getRecommendedBTCFees = () => {
  //Fees are measured in satoshis per byte, slowest should 
  //take around an hour, average should take around 30 minutes, 
  //and fastest should take around 20 to 30 minutes
  let feeFunctions = [getAtomicExplorerBTCFees()]

  return new Promise((resolve, reject) => {
    Promise.all(feeFunctions)
    .then((fees) => {
      let feesFound = []

      for (let i = 0; i < fees.length; i++) {
        if (fees[i]) {
          feesFound.push(fees[i])
        }
      }

      if (feesFound.length > 0) {
        let avgFees = {slowest: 0, average: 0, fastest: 0}

        for (let i = 0; i < feesFound.length; i++) {
          avgFees.slowest += feesFound[i].slowest
          avgFees.average += feesFound[i].average
          avgFees.fastest += feesFound[i].fastest
        }

        for (let key in avgFees) {
          avgFees[key] = truncateDecimal((avgFees[key]/feesFound.length), 0)
        }

        resolve(avgFees)
      }
      else {
        resolve(false)
      }
    })
  });
}

export const getAllCoinRates = (activeCoinsForUser) => {
  let promiseArray = []

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    promiseArray.push(getCoinRate(activeCoinsForUser[i]))
  }

  return new Promise((resolve, reject) => {
    Promise.all(promiseArray)
    .then((rates) => {
      if (rates.every(item => {return !item})) {
        resolve(false)
      }
      else {
        let resolveObj = {}
        for (let i = 0; i < rates.length; i++) {
          if (rates[i]) {
            resolveObj[rates[i].id] = rates[i].rate
          }
          else {
            resolveObj[rates[i].id] = "err"
          }
        }
        resolve(resolveObj)
      }
    })
  });
}
