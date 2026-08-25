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
import { REQUEST_TIMEOUT_MS } from '../../../../../env/index';

export const ELECTRUM_REQUEST_TIMEOUT_CODE = "ELECTRUM_REQUEST_TIMEOUT";
export const ELECTRUM_AMBIGUOUS_BROADCAST_CODE =
  "ELECTRUM_AMBIGUOUS_BROADCAST";

const createElectrumTimeoutError = (callType, timeoutMs) => {
  const error = new Error(
    `Electrum ${callType} request timed out after ${timeoutMs}ms.`,
  );
  error.code = ELECTRUM_REQUEST_TIMEOUT_CODE;
  error.timedOut = true;
  return error;
};

const annotatePostError = (error, callType, requestDispatched) => {
  const annotatedError =
    error instanceof Error ? error : new Error(String(error || "Electrum request failed."));

  if (annotatedError.electrumPostError === true) return annotatedError;

  annotatedError.electrumPostError = true;
  annotatedError.requestDispatched = requestDispatched;
  annotatedError.ambiguousBroadcast =
    callType === "pushtx" && requestDispatched;
  annotatedError.transportCode = annotatedError.code;

  if (annotatedError.ambiguousBroadcast) {
    annotatedError.code = ELECTRUM_AMBIGUOUS_BROADCAST_CODE;
  } else if (annotatedError.timedOut) {
    annotatedError.code = ELECTRUM_REQUEST_TIMEOUT_CODE;
  }

  return annotatedError;
};

// This purpose of this method is to take in a list of electrum servers,
// and use a valid one to call a specified command given a set of parameters
// It first chooses a proxy server at random, then find out which electrum
// servers are working by attempting to call getBlockHeight on each of them.
// It then calls the specified command with the specified params (passed in as an object)
// on that electrum server with an HTTP get
export const getElectrum = async (
  coinObj,
  callType,
  params,
  toSkip,
  timeoutMs = REQUEST_TIMEOUT_MS,
) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Electrum request timeout must be a positive number.");
  }

  const abortController =
    typeof AbortController === "undefined" ? null : new AbortController();
  const deadlineRequestOptions = {timeout: timeoutMs};
  if (abortController != null) {
    deadlineRequestOptions.signal = abortController.signal;
  }
  let deadlineExpired = false;
  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      deadlineExpired = true;
      reject(createElectrumTimeoutError(callType, timeoutMs));
      if (abortController != null) abortController.abort();
    }, timeoutMs);
  });
  const assertDeadlineActive = () => {
    if (deadlineExpired) {
      throw createElectrumTimeoutError(callType, timeoutMs);
    }
  };
  const shouldCancelDiscovery = () => deadlineExpired;

  const requestPromise = (async () => {
    const serverList = coinObj.electrum_endpoints;
    const coinID = coinObj.id;
    const proxyServer = (
      await getGoodServer(
        testProxy,
        proxyServers,
        [],
        null,
        deadlineRequestOptions,
        shouldCancelDiscovery,
      )
    ).goodServer;
    assertDeadlineActive();
    let goodServerRes = null;

    if (toSkip) {
      const filteredServerList = serverList.filter(
        server => !toSkip.includes(server),
      );

      goodServerRes = await getGoodServer(
        testElectrum,
        filteredServerList,
        [proxyServer],
        null,
        deadlineRequestOptions,
        shouldCancelDiscovery,
      );
      assertDeadlineActive();
    }

    const proxyIndex = serverList.findIndex(
      server => server.split(":")[0] === proxyServer,
    );

    if (goodServerRes == null) {
      goodServerRes = await getGoodServer(
        testElectrum,
        serverList,
        [proxyServer],
        proxyIndex !== -1 ? proxyIndex : null,
        deadlineRequestOptions,
        shouldCancelDiscovery,
      );
      assertDeadlineActive();
    }

    const electrumSplit = goodServerRes.goodServer.split(":");
    const goodServer = {
      ip: electrumSplit[0],
      port: electrumSplit[1],
      proto: electrumSplit[2],
    };
    const resultObj = {
      goodServer,
      blockHeight: goodServerRes.testResult.result,
    };
    const eServer = resultObj.goodServer;

    resultObj.electrumVersion = await getServerVersion(
      proxyServer,
      eServer.ip,
      eServer.port,
      eServer.proto,
      httpsEnabled,
      deadlineRequestOptions,
    );
    assertDeadlineActive();

    const electrumServer = resultObj.goodServer;
    let httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}?port=${electrumServer.port}&ip=${electrumServer.ip}&proto=${electrumServer.proto}`;

    updateParamObj(
      params,
      networks[coinID.toLowerCase()]
        ? networks[coinID.toLowerCase()]
        : networks['default'],
      resultObj.electrumVersion,
    );

    for (const key in params) {
      httpAddr += `&${key}=${params[key]}`;
    }

    // Server/proxy discovery is also covered by the overall deadline. Do not
    // start a late HTTP request if discovery only finished after the caller
    // was already released by the timeout race.
    assertDeadlineActive();

    let res;
    try {
      res = await axios.get(httpAddr, deadlineRequestOptions);
    } catch (error) {
      if (
        error?.code === "ECONNABORTED" ||
        error?.code === "ETIMEDOUT" ||
        deadlineExpired
      ) {
        const timeoutError = createElectrumTimeoutError(callType, timeoutMs);
        timeoutError.cause = error;
        throw timeoutError;
      }
      throw error;
    }

    if (!isJson(res.data)) {
      throw new Error("Invalid JSON in callCreators.js, received: " + res);
    }

    return {
      result: res.data.result,
      blockHeight: resultObj.blockHeight,
      electrumUsed: resultObj.goodServer,
      electrumVersion: resultObj.electrumVersion,
    };
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

//Function to update only if values have changed
export const electrumRequest = async (
  coinObj,
  callType,
  params,
  toSkip,
  timeoutMs = REQUEST_TIMEOUT_MS,
) => {
  try {
    const response = await getElectrum(
      coinObj,
      callType,
      params,
      toSkip,
      timeoutMs,
    )

    return !response ? false : {coin: coinObj.id, ...response}
  } catch(err) {
    console.warn(err)
      
    const apiError = new ApiException(
      err.message || err.name,
      err.message,
      coinObj.id,
      ELECTRUM,
      err.code
    );
    apiError.timedOut = err.timedOut === true;
    apiError.cause = err;
    throw apiError;
  }
}

export const postElectrum = async (
  serverList,
  callType,
  data,
  toSkip,
  timeoutMs = REQUEST_TIMEOUT_MS,
) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Electrum request timeout must be a positive number.");
  }

  let requestDispatched = false;
  const abortController =
    typeof AbortController === "undefined" ? null : new AbortController();
  const discoveryRequestOptions = {timeout: timeoutMs};
  if (abortController != null) {
    discoveryRequestOptions.signal = abortController.signal;
  }
  let deadlineExpired = false;
  let timeoutId;
  const shouldCancelDiscovery = () => deadlineExpired;

  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      deadlineExpired = true;
      const timeoutError = new Error(
        `Electrum ${callType} request timed out after ${timeoutMs}ms.`,
      );
      timeoutError.timedOut = true;
      reject(timeoutError);

      if (abortController != null) abortController.abort();
    }, timeoutMs);
  });

  const requestPromise = (async () => {
    const proxyResult = await getGoodServer(
      testProxy,
      proxyServers,
      [],
      null,
      discoveryRequestOptions,
      shouldCancelDiscovery,
    );
    const proxyServer = proxyResult.goodServer;
    const filteredServerList = toSkip
      ? serverList.filter(server => !toSkip.includes(server))
      : serverList;
    const serverResult = await getGoodServer(
      testElectrum,
      filteredServerList,
      [proxyServer],
      toSkip ? null : toSkip,
      discoveryRequestOptions,
      shouldCancelDiscovery,
    );
    const electrumSplit = serverResult.goodServer.split(":");

    if (electrumSplit.length < 3) {
      throw new Error("Electrum server returned an invalid endpoint.");
    }

    const goodServer = {
      ip: electrumSplit[0],
      port: electrumSplit[1],
      proto: electrumSplit[2],
    };
    const httpAddr = `${httpsEnabled ? 'https' : 'http'}://${proxyServer}/api/${callType}`;
    const bodyObj = {
      port: goodServer.port,
      ip: goodServer.ip,
      proto: goodServer.proto,
      ...data,
    };
    const axiosOptions = {
      headers: {
        "Content-type": "application/json",
      },
      timeout: timeoutMs,
    };

    if (abortController != null) {
      axiosOptions.signal = abortController.signal;
    }

    // Promise.race cannot cancel server discovery. On runtimes without
    // AbortController, a lookup that completes after the caller timed out must
    // not be allowed to dispatch a late transaction broadcast.
    if (deadlineExpired) {
      const timeoutError = new Error(
        `Electrum ${callType} request timed out after ${timeoutMs}ms.`,
      );
      timeoutError.timedOut = true;
      throw timeoutError;
    }

    // From this point onward, response loss cannot prove that a broadcast was
    // rejected. Mark every subsequent pushtx transport/parse error ambiguous.
    requestDispatched = true;
    const response = await axios.post(httpAddr, bodyObj, axiosOptions);

    if (!isJson(response.data)) {
      throw new Error("Electrum proxy returned an invalid JSON response.");
    }

    return {
      result: response.data.result,
      error: response.data.error,
      msg: response.data.msg,
      blockHeight: serverResult.testResult.result,
      electrumUsed: goodServer,
    };
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    throw annotatePostError(error, callType, requestDispatched);
  } finally {
    clearTimeout(timeoutId);
  }
}
