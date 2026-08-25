

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
import axios from 'axios';

const createDiscoveryCancellationError = () =>
  new Error('Electrum server discovery was cancelled.');

const assertDiscoveryActive = (requestOptions, shouldCancel) => {
  if (
    requestOptions?.signal?.aborted ||
    (typeof shouldCancel === 'function' && shouldCancel())
  ) {
    throw createDiscoveryCancellationError();
  }
};

/**
 * @param {Function} tester A tester function that takes in a server and will fail if it does not perform it's purpose
 * @param {String[]} serverList A list of server strings in the format the tester requires
 * @param {Array} xtraTesterParams (Optional) A list of extra parameters for the tester function
 * @param {Number} startIndex (Optional) The index in the serverlist that will be checked first
 * @param {Object} requestOptions (Optional) Axios options passed to each tester
 * @param {Function} shouldCancel (Optional) Shared discovery cancellation predicate
 */
export const getGoodServer = (
  tester,
  serverList,
  xtraTesterParams = [],
  startIndex = null,
  requestOptions = null,
  shouldCancel = null,
) => {
  try {
    assertDiscoveryActive(requestOptions, shouldCancel);
  } catch (error) {
    return Promise.reject(error);
  }

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
    assertDiscoveryActive(requestOptions, shouldCancel);

    let _serverList = serverList.slice()
    _serverList.splice(index, 1);
    return getGoodServer(
      tester,
      _serverList,
      xtraTesterParams,
      null,
      requestOptions,
      shouldCancel,
    )
  }

  const state = Store.getState()

  const goodServerCache = state.electrum.goodServers
  const cachedGoodServer = serverList.find(value => goodServerCache[value] != null)

  if (cachedGoodServer) {
    try {
      assertDiscoveryActive(requestOptions, shouldCancel);
      return Promise.resolve(goodServerCache[cachedGoodServer]);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const badServerCache = state.electrum.badServers
  const cachedBadServerIndex = serverList.findIndex(value => badServerCache[value] != null)

  if (cachedBadServerIndex !== -1) return handleBadServer(cachedBadServerIndex)

  let index =
    startIndex == null
      ? Math.floor(Math.random() * serverList.length)
      : startIndex;
  const testerParams = requestOptions == null
    ? xtraTesterParams
    : [...xtraTesterParams, requestOptions];

  return new Promise((resolve, reject) => {
    tester(serverList[index], ...testerParams)
    .then((res) => {
      assertDiscoveryActive(requestOptions, shouldCancel);

      Store.dispatch(recordGoodServer({
        goodServer: serverList[index],
        testResult: res
      }))

      resolve({
        goodServer: serverList[index],
        testResult: res
      })
    }, async () => {
      assertDiscoveryActive(requestOptions, shouldCancel);

      const networkInfo = await NetInfo.fetch()
      assertDiscoveryActive(requestOptions, shouldCancel);

      // Only strike the server if internet connectivity isn't broken
      if (networkInfo.isConnected && networkInfo.isInternetReachable) {
        assertDiscoveryActive(requestOptions, shouldCancel);
        Store.dispatch(recordBadServer(serverList[index]))
      }

      assertDiscoveryActive(requestOptions, shouldCancel);
      return handleBadServer(index)
    })
    .then(res => {
      resolve(res)
    })
    .catch((err) => {      
      reject(err)
    })
  })
}

export const testElectrum = (electrumString, proxy, requestOptions = null) => {
  let electrumSplit = electrumString.split(":")
  let electrum = {
    ip: electrumSplit[0],
    port: electrumSplit[1],
    proto: electrumSplit[2],
  }

  return new Promise((resolve, reject) => {
    getBlockHeight(proxy, electrum, requestOptions)
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

export const testProxy = async (proxyServer, requestOptions = null) => {
  const address = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}`;
  const res = requestOptions == null
    ? await axios.get(address)
    : await axios.get(address, requestOptions)

  if (res.status === 200) {
    return true
  } else {
    throw new Error(res.data)
  }
}
