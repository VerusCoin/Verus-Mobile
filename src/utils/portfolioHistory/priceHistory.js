/* global __DEV__ */
/* eslint-disable import/no-cycle -- Price routes use the existing Redux-backed VRPC provider. */
import axios from 'axios';
// eslint-disable-next-line import/named -- Metro resolves the build's env entry point.
import { REQUEST_TIMEOUT_MS } from '../../../env/index';
import { getOnChainPriceRoute } from '../api/channels/general/ratesAPIs/onChainPrice';
import { getNativeUsdPrice, getRouteUsdPrice } from '../api/channels/general/ratesAPIs/onChainPriceMath';
import { getCoinPaprikaId } from '../api/channels/general/ratesAPIs/coinPaprika';
import { getCurrencyState } from '../api/channels/vrpc/requests/getCurrencyState';
import {
  cachedHistory, mergeSamples, savedNote, savedSamples, saveNote,
} from './priceCache';
import { DAY, HOUR, interpolate } from './chartMath';

const resultOf = (response) => {
  if (response.error) throw new Error(response.error.message || 'History request failed.');
  return response.result;
};
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const date = (time) => new Date(time).toISOString().slice(0, 10);
const ensureFocused = (canFetch) => {
  if (!canFetch()) throw new Error('Home is no longer focused.');
};

// At most 90 states in a request; range ends on the newest estimated height.
export const fetchBasketHistory = async ({
  endpoint, systemId, basketId, start, end, now, step, canFetch,
}) => {
  ensureFocused(canFetch);
  const info = resultOf(await endpoint.getInfo());
  const height = Number(info?.blocks ?? info?.longestchain);
  if (!Number.isFinite(height) || height <= 0) throw new Error('Chain height is unavailable.');
  const endHeight = Math.max(1, height - Math.floor((now - end) / 60000));
  const firstHeight = Math.max(1, height - Math.ceil((now - start) / 60000));
  const fromHeight = endHeight - (Math.floor(Math.max(0, endHeight - firstHeight) / step) * step);
  const states = [];
  for (let from = fromHeight; from <= endHeight; from += 90 * step) {
    ensureFocused(canFetch);
    const through = Math.min(endHeight, from + (89 * step));
    // eslint-disable-next-line no-await-in-loop -- Serialize the bounded VRPC batches.
    const result = resultOf(await getCurrencyState(endpoint, systemId, basketId, from, through, step));
    if (!Array.isArray(result)) throw new Error('Currency history is unavailable.');
    states.push(...result);
  }
  return states.filter((item) => positive(item.blocktime) && item.currencystate);
};

const tiers = (start, now) => [
  {
    name: 'weekly', start, end: now - (31 * DAY), step: 10080,
  },
  {
    name: 'daily', start: Math.max(start, now - (31 * DAY)), end: now, step: 1440,
  },
  {
    name: 'hourly', start: Math.max(start, now - (25 * HOUR)), end: now, step: 60,
  },
].filter((tier) => tier.start <= tier.end);

const tierKey = (route, name) => `chain:${route.endpoint.endpoint}:${route.currencyId}:${route.basketId}:${route.kind}:${route.referenceId || ''}:${name}`;
// The route of an on-chain price needs requests. This note finds its saved samples without them.
const routeNoteKey = (coin) => `route:${coin.id}:${coin.system_id || ''}:${coin.price_currency_id || ''}`;
const paprikaDailyKey = (id) => `paprika:${id}:daily`;
const ecbKey = (currency) => `ecb:${currency}`;

const chainSeries = async (route, start, now, canFetch, hourly) => {
  if (route.kind === 'fixed') return [[start, 1], [now, 1]];
  if (!route.basketId || !positive(route.price)) throw new Error('No usable on-chain price route.');
  const samples = [];
  // The native USD series always comes from the native chain, including for PBaaS.
  const native = route.kind === 'native' || route.referenceId !== route.config.native ? []
    : await chainSeries({
      ...route,
      kind: 'native',
      currencyId: route.config.native,
      referenceId: undefined,
      basketId: route.config.basket,
      endpoint: route.nativeEndpoint,
      systemId: route.config.native,
    }, start, now, canFetch, hourly);
  const historyTiers = tiers(start, now).filter((tier) => hourly || tier.name !== 'hourly');
  for (let i = 0; i < historyTiers.length; i++) {
    const tier = historyTiers[i];
    const period = { hourly: HOUR, daily: DAY, weekly: 7 * DAY }[tier.name];
    const key = tierKey(route, tier.name);
    // eslint-disable-next-line no-await-in-loop -- Share each completed tier before fetching the next.
    const data = await cachedHistory({
      key,
      start: tier.start,
      end: tier.end,
      stamp: Math.floor(now / period),
      memory: tier.name === 'hourly',
      canFetch,
      fetchSamples: async (from, end) => {
        const states = await fetchBasketHistory({
          ...route, start: from, end, now, step: tier.step, canFetch,
        });
        return states.flatMap((item) => {
          const time = Number(item.blocktime) * 1000;
          const price = route.kind === 'native'
            ? getNativeUsdPrice({ bestcurrencystate: item.currencystate }, route.config)
            : getRouteUsdPrice(route, item.currencystate, interpolate(native, time));
          return positive(price) ? [[time, Number(price)]] : [];
        });
      },
    });
    samples.push(data);
  }
  return mergeSamples(...samples);
};

const paprikaSeries = async (coin, start, now, canFetch, hourly) => {
  const id = getCoinPaprikaId(coin);
  if (!id) throw new Error('No CoinPaprika history ID.');
  const fetchSamples = (interval) => async (from) => {
    ensureFocused(canFetch);
    const url = `https://api.coinpaprika.com/v1/tickers/${id}/historical`;
    const { data } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      params: { start: new Date(from).toISOString(), interval },
    });
    if (!Array.isArray(data)) throw new Error('CoinPaprika history is unavailable.');
    const samples = data.flatMap((item) => {
      const time = Date.parse(item.timestamp);
      return Number.isFinite(time) && positive(item.price) ? [[time, Number(item.price)]] : [];
    });
    // New old data is weekly. Previously cached daily samples are never discarded.
    let last = -Infinity;
    return samples.filter(([time]) => {
      if (interval === '1h' || time >= now - (31 * DAY) || time - last >= 7 * DAY) {
        last = time;
        return true;
      }
      return false;
    });
  };
  const daily = await cachedHistory({
    key: paprikaDailyKey(id),
    start: Math.max(start, now - (365 * DAY)),
    end: now,
    stamp: date(now),
    oncePerPeriod: true,
    canFetch,
    fetchSamples: fetchSamples('1d'),
  });
  if (!hourly) return daily;
  let hourlySamples = [];
  try {
    hourlySamples = await cachedHistory({
      key: `paprika:${id}:hourly`,
      start: Math.max(start, now - (24 * HOUR)),
      end: now,
      stamp: Math.floor(now / HOUR),
      memory: true,
      oncePerPeriod: true,
      canFetch,
      fetchSamples: fetchSamples('1h'),
    });
  } catch (error) {
    // Daily history can still draw the range when an hourly endpoint is unavailable.
    console.warn('Could not load hourly CoinPaprika history.', error.message);
  }
  return mergeSamples(daily, hourlySamples);
};

// Without `hourly`, only the daily and weekly prices load. They are enough for 1M and longer.
export const getUsdHistory = async (coin, start, now, canFetch = () => true, hourly = true) => {
  // Also protect against a stale development price still present in a release ledger.
  if (coin.testnet && !__DEV__) return [];
  ensureFocused(canFetch);
  if (coin.proto === 'vrsc' || coin.price_currency_id) {
    const route = await getOnChainPriceRoute(coin);
    if (!route) throw new Error('On-chain price route is unavailable.');
    const samples = await chainSeries(route, start, now, canFetch, hourly);
    saveNote(routeNoteKey(coin), route.kind === 'fixed' ? { fixed: true }
      : { keys: ['weekly', 'daily'].map((name) => tierKey(route, name)) }).catch(() => {});
    return samples;
  }
  return paprikaSeries(coin, start, now, canFetch, hourly);
};

// The saved daily and weekly prices of a coin, without a request. Null when the phone has none.
export const getSavedUsdHistory = (coin, start, now) => {
  if (coin.testnet && !__DEV__) return [];
  let keys;
  if (coin.proto === 'vrsc' || coin.price_currency_id) {
    const note = savedNote(routeNoteKey(coin));
    if (note?.fixed) return [[start, 1], [now, 1]];
    keys = note?.keys;
  } else {
    const id = getCoinPaprikaId(coin);
    keys = id && [paprikaDailyKey(id)];
  }
  const samples = keys && savedSamples(keys);
  return samples?.length ? samples : null;
};

export const getSavedFiatHistory = (currency) => {
  if (currency === 'USD') return [];
  const samples = savedSamples([ecbKey(currency)]);
  return samples?.length ? samples : null;
};

// SDMX-JSON uses dimension indexes in both the series key and observation key.
export const parseEcbHistory = (data, currency) => {
  const { structure } = data;
  const currencyIndex = structure?.dimensions?.series?.findIndex((d) => d.id === 'CURRENCY');
  const currencies = structure?.dimensions?.series?.[currencyIndex]?.values || [];
  const times = structure?.dimensions?.observation?.find((d) => d.id === 'TIME_PERIOD')?.values || [];
  const byCurrency = {};
  Object.entries(data.dataSets?.[0]?.series || {}).forEach(([key, series]) => {
    const code = currencies[Number(key.split(':')[currencyIndex])]?.id;
    if (!code) return;
    byCurrency[code] = Object.entries(series.observations || {}).flatMap(([index, observation]) => {
      const time = Date.parse(times[Number(index)]?.id);
      return Number.isFinite(time) && positive(observation[0]) ? [[time, Number(observation[0])]] : [];
    }).sort((a, b) => a[0] - b[0]);
  });
  const usd = byCurrency.USD || [];
  const target = new Map(byCurrency[currency] || []);
  return usd.flatMap(([time, value]) => {
    if (currency === 'EUR') return [[time, 1 / value]];
    return target.has(time) ? [[time, target.get(time) / value]] : [];
  });
};

export const getFiatHistory = async (currency, start, now, canFetch = () => true) => {
  if (currency === 'USD') return [];
  return cachedHistory({
    key: ecbKey(currency),
    start,
    end: now,
    stamp: date(now),
    oncePerPeriod: true,
    canFetch,
    fetchSamples: async (from) => {
      ensureFocused(canFetch);
      const pair = currency === 'EUR' ? 'USD' : `USD+${currency}`;
      const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${pair}.EUR.SP00.A`;
      // Include the preceding week for weekends and bank holidays at the range start.
      const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        params: { startPeriod: date(from - (7 * DAY)), format: 'jsondata' },
      });
      return parseEcbHistory(data, currency);
    },
  });
};
