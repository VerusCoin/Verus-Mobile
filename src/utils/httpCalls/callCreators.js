export * from './electrumCalls/getBlockHeight';
export * from './electrumCalls/getBalances';
export * from './electrumCalls/getTransactions';
export * from './electrumCalls/getTransaction';
export * from './electrumCalls/getBlockInfo';
export * from './electrumCalls/getUnspent';
export * from './electrumCalls/getMerkle';
export * from './electrumCalls/pushTx'

import { proxyServers } from './proxyServers';
import { getBlockHeight } from './electrumCalls/getBlockHeight';
import { getCoinPaprikaRate } from './ratesAPIs/coinPaprika';
import { getAtomicExplorerBTCFees } from './btcFeesAPIs/atomicExplorer';
import { truncateDecimal } from '../math'

// This purpose of this method is to take in a list of electrum servers,
// and use a valid one to call a specified command given a set of parameters
// It first chooses a proxy server at random, then find out which electrum
// servers are working by attempting to call getBlockHeight on each of them.
// It then calls the specified command with the specified params (passed in as an object)
// on that electrum server with an HTTP get
export const getElectrum = (serverList, callType, params, skipServer) => {
  const proxyServer = proxyServers[Math.round(Math.random() * (proxyServers.length - 1))]
  let servers = []
  let serverPromises = []
  let serverInfo = []
  let _i = 0
  let _x = 0

  //Only push non skipped servers to the server array
  while ((_i + _x) < serverList.length) {
    serverInfo = serverList[(_i + _x)].split(":")
    let _serverToPush = {
      ip: serverInfo[0],
      port: serverInfo[1],
      proto: serverInfo[2],
    }
    if (JSON.stringify(_serverToPush) !== JSON.stringify(skipServer)) {
      servers.push(_serverToPush)
      serverPromises.push(getBlockHeight(proxyServer, servers[_i]))
      _i++
    }
    else {
      _x++
    }
  }

  

  return new Promise((resolve, reject) => {
    Promise.all(serverPromises)
    .then((results) => {
      //Here we pick a random server that has a connection
      let index = 0
      let resultObj = {}
      let randNum = (Math.round(Math.random() * 3)) + 1
      let skipped = 0
      
      while(skipped <= randNum || results[index].msg != "success" || !results[index]) {
        if (results[index].msg == "success") {
          skipped++
        }

        if (index == (results.length - 1)) {
          index = 0
        }
        else {
          index++
        }
      }

      if (index < results.length) {
        resultObj = {goodServer: servers[index], blockHeight: results[index].result}
        return resultObj
      } else {
        throw "No good server found"
      }
    })
    .then((resultObj) => {
      let electrumServer = resultObj.goodServer
      let httpAddr = `http://${proxyServer.ip}:${proxyServer.port}/api/${callType}?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`
      let promiseArray = []

      for (let key in params) {
        httpAddr += `&${key}=${params[key]}`
      }

      promiseArray.push(
        fetch(httpAddr, {
        method: 'GET'
        }))

      promiseArray.push(resultObj.blockHeight)
      promiseArray.push(resultObj.goodServer)

      return Promise.all(promiseArray)
    })
    .then((responseArray) => {
      responseArray[0] = responseArray[0].json()

      return Promise.all(responseArray)
    })
    .then((responseArray) => {
      let resultObj = {result: responseArray[0].result, blockHeight: responseArray[1], serverUsed: responseArray[2]}

      resolve(resultObj)
    })
    .catch(err => console.log(err))
  });
}

//Function to update only if values have changed
export const updateValues = (oldResponse, serverList, callType, params, coinID, skipServer) => {
  return new Promise((resolve, reject) => {
    getElectrum(serverList, callType, params, skipServer)
    .then((response) => {
      if(response === oldResponse) {
        resolve({
          coin: coinID,
          result: oldResponse,
          new: false,
          blockHeight: response.blockHeight,
          serverUsed: response.serverUsed
        })
      } else if (response === false) {
        resolve(false)
      } else {
        resolve({
          coin: coinID,
          result: response,
          new: true,
          blockHeight: response.blockHeight,
          serverUsed: response.serverUsed
        })
      }
    })
  });
}

export const postElectrum = (serverList, callType, data, skipServer) => {
  const proxyServer = proxyServers[Math.round(Math.random() * (proxyServers.length - 1))]
  let servers = []
  let serverPromises = []
  let serverInfo = []

  for (let i = 0; i < serverList.length; i++) {
    serverInfo = serverList[i].split(":")
    servers.push({
      ip: serverInfo[0],
      port: serverInfo[1],
      proto: serverInfo[2],
    })
    serverPromises.push(getBlockHeight(proxyServer, servers[i]))
  }

  return new Promise((resolve, reject) => {
    Promise.all(serverPromises)
    .then((results) => {
      //Here we pick a random server that has a connection
      let index = 0
      let resultObj = {}
      let randNum = (Math.round(Math.random() * 3)) + 1
      let skipped = 0

      if(skipServer) {
        let spliceIndex = -1
        for (let i = 0; i < servers.length; i++) {
          if (JSON.stringify(servers[i]) === JSON.stringify(skipServer)) {
            spliceIndex = i
          }
        }
        if (spliceIndex > -1) {
          servers.splice(spliceIndex, 1)
        }
      }
      
      while(skipped <= randNum || results[index].msg != "success") {
        if (results[index].msg == "success") {
          skipped++
        }

        if (index == (results.length - 1)) {
          index = 0
        }
        else {
          index++
        }
      }

      if (index < results.length) {
        resultObj = {goodServer: servers[index], blockHeight: results[index].result}
        return resultObj
      } else {
        resolve(false)
      }
    })
    .then((resultObj) => {
      let electrumServer = resultObj.goodServer
      let httpAddr = `http://${proxyServer.ip}:${proxyServer.port}/api/${callType}`
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
      console.log(fees)

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
