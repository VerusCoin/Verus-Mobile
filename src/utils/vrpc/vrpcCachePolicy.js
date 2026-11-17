export const VRPC_ADDRESS_CACHE_REQUESTS = [
  'getaddressbalance',
  'getaddressdeltas',
  'getaddressmempool',
];

export const CACHED_VRPC_REQUESTS = [
  ...VRPC_ADDRESS_CACHE_REQUESTS,
  'getcurrency',
  'listcurrencies',
  'getinfo',
];

export const DEFAULT_VRPC_CACHE_MAX_AGE_MS = 60000;

export const VRPC_CACHE_MAX_AGE_MS = {
  getaddressbalance: 5000,
  getaddressdeltas: 10000,
  getaddressmempool: 10000,
  listcurrencies: 600000,
  getinfo: 1000,
};

export const isVrpcResponseCacheable = command => {
  return CACHED_VRPC_REQUESTS.includes(command);
};

export const getVrpcCacheMaxAge = command => {
  return (
    VRPC_CACHE_MAX_AGE_MS[command] || DEFAULT_VRPC_CACHE_MAX_AGE_MS
  );
};

export const shouldUseCachedVrpcResponse = ({
  command,
  lastNetworkResponseAt,
  now = Date.now(),
}) => {
  return (
    isVrpcResponseCacheable(command) &&
    Number(lastNetworkResponseAt) > 0 &&
    now - Number(lastNetworkResponseAt) < getVrpcCacheMaxAge(command)
  );
};
