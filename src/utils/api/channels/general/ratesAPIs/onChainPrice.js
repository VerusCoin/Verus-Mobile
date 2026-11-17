/* eslint-disable import/no-cycle -- The shared VRPC provider is initialized through Redux dispatchers. */
import VrpcProvider from '../../../../vrpc/vrpcInterface';
import { CoinDirectory } from '../../../../CoinData/CoinDirectory';
import { getCurrencyConverters } from '../../vrpc/requests/getCurrencyConverters';
import {
  MAINNET_PRICE_CONFIG,
  TESTNET_PRICE_CONFIG,
  selectCurrencyPriceRoute,
  getNativeUsdPrice,
} from './onChainPriceMath';

const CACHE_MS = 60000;
const cache = new Map();

export const clearOnChainPriceCache = () => cache.clear();

const cached = (key, fetchValue) => {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.promise;
  const fresh = { expiresAt: Date.now() + CACHE_MS };
  fresh.promise = Promise.resolve().then(fetchValue)
    .finally(() => {
      // Start the TTL on receipt, after the provider's own cache was updated.
      fresh.expiresAt = Date.now() + CACHE_MS;
    });
  cache.set(key, fresh);
  return fresh.promise;
};

const resultOf = (response) => {
  if (response.error) throw new Error(response.error.message);
  return response.result;
};

// A wallet can hold a Verus currency on Ethereum without VRSC itself, so the
// native chain endpoint is not always initialized. Initialize it once here.
const endpointFor = (systemId, fallbackUrl) => {
  try {
    return VrpcProvider.getEndpoint(systemId);
  } catch (error) {
    if (!fallbackUrl) throw error;
    VrpcProvider.initEndpoint(systemId, fallbackUrl);
    return VrpcProvider.getEndpoint(systemId);
  }
};

const getCurrency = (endpoint, currencyId) => cached(
  `${endpoint.endpoint}:currency:${currencyId}`,
  async () => resultOf(await endpoint.getCurrency(currencyId)),
);

export const getOnChainPriceRoute = async (coinObj) => {
  const config = coinObj.testnet ? TESTNET_PRICE_CONFIG : MAINNET_PRICE_CONFIG;
  const currencyId = coinObj.price_currency_id || coinObj.currency_id;
  const systemId = coinObj.price_currency_id ? config.native : coinObj.system_id;
  if (!currencyId || !systemId) return null;

  const nativeUrl = CoinDirectory.getVrpcEndpoints(coinObj.testnet ? 'VRSCTEST' : 'VRSC')?.[0];
  const endpoint = endpointFor(
    systemId,
    systemId === config.native ? nativeUrl : coinObj.vrpc_endpoints?.[0],
  );
  const nativeEndpoint = endpointFor(config.native, nativeUrl);
  const source = endpoint.endpoint;
  const context = {
    config, currencyId, systemId, endpoint, nativeEndpoint, source,
  };
  if (currencyId === config.anchor) return { ...context, kind: 'fixed', price: '1' };

  const nativeUsd = await cached(
    `${nativeEndpoint.endpoint}:native:${config.native}`,
    async () => getNativeUsdPrice(await getCurrency(nativeEndpoint, config.basket), config),
  );
  if (currencyId === config.native) {
    return {
      ...context, kind: 'native', basketId: config.basket, price: nativeUsd,
    };
  }

  const definition = await getCurrency(endpoint, currencyId);
  let baskets = [];
  if (!definition?.bestcurrencystate?.reservecurrencies?.length) {
    // Gateway currencies such as vETH use the parent chain's baskets. PBaaS
    // systems keep their own endpoint and their own converter definitions.
    const system = await getCurrency(endpoint, systemId);
    const converters = await cached(
      `${source}:converters:${currencyId}`,
      async () => resultOf(await getCurrencyConverters(systemId, currencyId)),
    );
    const definitions = (converters || []).map((record) => Object.values(record)
      .find((value) => value && typeof value === 'object'
        && value.currencyid && record[value.currencyid] === value));
    baskets = await Promise.all(definitions
      .filter((basket) => basket?.systemid === system?.systemid)
      // Converter records hold notarization states, which can be stale. Read
      // bestcurrencystate on this system and share those reads across coins.
      .map((basket) => getCurrency(endpoint, basket.currencyid)));
  }

  const route = selectCurrencyPriceRoute(currencyId, definition, baskets, nativeUsd, config);
  return { ...context, ...route, basketId: route.kind === 'basket' ? currencyId : route.basket?.currencyid };
};

export const getOnChainRate = async (coinObj) => {
  const route = await getOnChainPriceRoute(coinObj);
  return { result: { rate: route?.price ?? null, source: route?.source ?? null } };
};
