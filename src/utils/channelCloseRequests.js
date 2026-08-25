let channelCloseRequestSequence = 0;
const pendingChannelCloseRequests = new Map();

const createChannelCloseRequest = timeoutMs => {
  const requestId = `channel-close-${++channelCloseRequestSequence}`;
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  const request = {resolve, reject, timeoutHandler: null, timeoutId: null};
  pendingChannelCloseRequests.set(requestId, request);
  if (timeoutMs != null) {
    request.timeoutId = setTimeout(() => {
      const error = new Error('Timed out while closing wallet channel.');
      error.code = 'CHANNEL_CLOSE_TIMEOUT';
      if (request.timeoutHandler != null) request.timeoutHandler(error);
      rejectChannelCloseRequest(requestId, error);
    }, timeoutMs);
  }

  return {requestId, promise};
};

export const channelCloseRequestIsPending = requestId =>
  pendingChannelCloseRequests.has(requestId);

export const setChannelCloseRequestTimeoutHandler = (requestId, handler) => {
  const request = pendingChannelCloseRequests.get(requestId);
  if (request == null) return false;

  request.timeoutHandler = handler;
  return true;
};

export const resolveChannelCloseRequest = (requestId, result) => {
  const request = pendingChannelCloseRequests.get(requestId);
  if (request == null) return false;

  pendingChannelCloseRequests.delete(requestId);
  clearTimeout(request.timeoutId);
  request.resolve(result);
  return true;
};

export const rejectChannelCloseRequest = (requestId, error) => {
  const request = pendingChannelCloseRequests.get(requestId);
  if (request == null) return false;

  pendingChannelCloseRequests.delete(requestId);
  clearTimeout(request.timeoutId);
  request.reject(error);
  return true;
};

export const dispatchChannelCloseRequest = (dispatch, action, timeoutMs) => {
  const request = createChannelCloseRequest(timeoutMs);

  try {
    // Redux carries only an opaque ID; the Promise callbacks remain outside
    // actions while the channel saga completes the matching native cleanup.
    dispatch({
      ...action,
      meta: {
        ...(action.meta || {}),
        channelCloseRequestId: request.requestId,
      },
    });
  } catch (error) {
    rejectChannelCloseRequest(request.requestId, error);
  }

  return request.promise;
};
