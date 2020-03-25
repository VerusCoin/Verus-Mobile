

//Given a list of servers, a function that tests for a server's availability,
//and optionally a list of servers to skip over, this recursive function 
//chooses a valid server from the serverList to use. It returns a promise that,
//if successful, resolves with the result of the passing test, and the working
//server that passed the test.

import { getBlockHeight } from './electrumCalls/getBlockHeight';
import { timeout } from '../../../promises'
import { httpsEnabled } from './proxyServers'
import ApiException from '../../errors/apiError';
import { ELECTRUM } from '../../../constants/intervalConstants';
import { NO_VALID_SERVER } from '../../errors/errorCodes';
import { CONNECTION_ERROR } from '../../errors/errorMessages'

/**
 * @param {Function} tester A tester function that takes in a server and will fail if it does not perform it's purpose
 * @param {String[]} serverList A list of server strings in the format the tester requires
 * @param {Array} xtraTesterParams (Optional) A list of extra parameters for the tester function
 */
export const getGoodServer = (tester, serverList, xtraTesterParams = []) => {
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

  let index = Math.floor(Math.random() * serverList.length)
  
  return new Promise((resolve, reject) => {
    tester(serverList[index], ...xtraTesterParams)
    .then((res) => {
      resolve({
        goodServer: serverList[index],
        testResult: res
      })
    }, (rej) => {
      //console.warn(rej)

      let _serverList = serverList.slice()
      _serverList.splice(index, 1);
      return (getGoodServer(tester, _serverList, xtraTesterParams))
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
    timeout(global.REQUEST_TIMEOUT_MS, getBlockHeight(proxy, electrum))
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
    timeout(global.REQUEST_TIMEOUT_MS, fetch(`${httpsEnabled ? 'https' : 'http'}://${proxyServer}`))
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