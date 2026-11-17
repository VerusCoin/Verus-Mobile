// verusd-rpc-ts-client returns this code when the request itself failed (no
// connection, timeout, HTTP error), not when the node answered with an error.
export const VRPC_TRANSPORT_ERROR_CODE = -32603;

export const BROADCAST_STATUS_UNKNOWN_MESSAGE =
  'The transaction may have been sent. Check your transaction history before starting another send.';
export const OFFLINE_NOTHING_SENT_MESSAGE =
  'No internet connection. Nothing was sent.';
export const CONNECTION_FAILED_MESSAGE =
  'Could not connect. Check your connection and try again.';

// Transport failures from axios, fetch and the VRPC client. Node rejections
// never match, so their own mapping still applies.
const CONNECTION_ERROR_PATTERN =
  /\b(network error|network request failed|timeout of \d+ms exceeded|timed out|econnaborted|econnrefused|econnreset|enotfound|request failed with status code 5\d\d)\b/i;

export const isConnectionErrorMessage = message =>
  typeof message === 'string' && CONNECTION_ERROR_PATTERN.test(message);
