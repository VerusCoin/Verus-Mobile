

//Given a list of servers, a function that tests for a server's availability,
//and optionally a list of servers to skip over, this recursive function 
//chooses a valid server from the serverList to use. It returns a promise that,
//if successful, resolves with the result of the passing test, and the working
//server that passed the test.

import { getBlockHeight } from './requests/getBlockHeight';
import { timeout } from '../../../promises'
import { httpsEnabled } from './proxyServers'
import ApiException from '../../errors/apiError';
import { ELECTRUM } from '../../../constants/intervalConstants';
import { NO_VALID_SERVER } from '../../errors/errorCodes';
import { CONNECTION_ERROR } from '../../errors/errorMessages'

import { REQUEST_TIMEOUT_MS } from '../../../../../env/index'
import Store from '../../../../store';
import { recordBadServer, recordGoodServer } from '../../../../actions/actionCreators';
import NetInfo from "@react-native-community/netinfo";

/**
 * @param {Function} tester A tester function that takes in a server and will fail if it does not perform it's purpose
 * @param {String[]} serverList A list of server strings in the format the tester requires
 * @param {Array} xtraTesterParams (Optional) A list of extra parameters for the tester function
 * @param {Number} startIndex (Optional) The index in the serverlist that will be checked first
 */
export const getGoodServer = (tester, serverList, xtraTesterParams = [], startIndex = null) => {
  if (serverList.length === 0) {
    return Promise.reject(
      new ApiException(
        CONNECTION_ERROR,
        "No valid server found out of options provided",
        null,
        ELECTRUM,
        NO_VALID_SERVER
      )
    );
  }

  const handleBadServer = (index) => {
    let _serverList = serverList.slice()
    _serverList.splice(index, 1);
    return (getGoodServer(tester, _serverList, xtraTesterParams))
  }

  const state = Store.getState()

  const goodServerCache = state.electrum.goodServers
  const cachedGoodServer = serverList.find(value => goodServerCache[value] != null)

  if (cachedGoodServer) return new Promise((resolve) => resolve(goodServerCache[cachedGoodServer]))

  const badServerCache = state.electrum.badServers
  const cachedBadServerIndex = serverList.findIndex(value => badServerCache[value] != null)

  if (cachedBadServerIndex !== -1) return handleBadServer(cachedBadServerIndex)

  let index =
    startIndex == null
      ? Math.floor(Math.random() * serverList.length)
      : startIndex;
  
  return new Promise((resolve, reject) => {
    tester(serverList[index], ...xtraTesterParams)
    .then((res) => {
      Store.dispatch(recordGoodServer({
        goodServer: serverList[index],
        testResult: res
      }))

      resolve({
        goodServer: serverList[index],
        testResult: res
      })
    }, async (rej) => {
      const networkInfo = await NetInfo.fetch()

      // Only strike the server if internet connectivity isn't broken
      if (networkInfo.isConnected && networkInfo.isInternetReachable) {
        Store.dispatch(recordBadServer(serverList[index]))
      }
      
      return handleBadServer(index)
    })
    .then(res => {
      resolve(res)
    })
    .catch(reject)
  })
}

export const testElectrum = (electrumString, proxy) => {
  let electrumSplit = electrumString.split(":")
  let electrum = {
    ip: electrumSplit[0],
    port: electrumSplit[1],
    proto: electrumSplit[2],
  }

  return new Promise((resolve, reject) => {
    timeout(REQUEST_TIMEOUT_MS, getBlockHeight(proxy, electrum))
      .then((response) => {
        if (response.msg === 'success') {
          resolve(response)
        } else {
          reject(new Error(response.msg))
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export const testProxy = (proxyServer) => {
  return new Promise((resolve, reject) => {
    timeout(REQUEST_TIMEOUT_MS, fetch(`${httpsEnabled ? 'https' : 'http'}://${proxyServer}`))
    .then((response) => {
      if (response.status === 200) {
        resolve(true)
      } else {
        reject(new Error(response))
      }
    })
    .catch((error) => {
      console.log(error)
      reject(error)
    })
  })
}