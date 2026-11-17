import BigNumber from 'bignumber.js';

export const MAINNET_PRICE_CONFIG = {
  native: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
  anchor: 'iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM',
  basket: 'i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx',
};

export const TESTNET_PRICE_CONFIG = {
  native: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
  // Owner approved 2026-11-04: DAI.vETH in Bridge.vETH.
  anchor: 'iN9vbHXexEh6GTZ45fRoJGKTQThfbgUwMh',
  basket: 'iSojYsotVzXz4wh2eJriASGo6UidJDDhL2',
};

const positive = (value) => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = BigNumber(value);
  return number.isFinite() && number.isGreaterThan(0) ? number : null;
};

const reservesOf = (definition) => {
  const state = definition?.bestcurrencystate;
  // CCurrencyState flags: PRELAUNCH = 2, REFUNDING = 4.
  // A positive launch supply alone does not establish a live basket.
  // eslint-disable-next-line no-bitwise -- These are daemon currency-state flags.
  if (!state || (state.flags & 6) !== 0 || definition.prelaunch === true
      || !positive(state.supply)) return [];
  return Array.isArray(state.reservecurrencies) ? state.reservecurrencies : [];
};

const reserveOf = (definition, currencyId) => reservesOf(definition)
  .find((reserve) => reserve.currencyid === currencyId);

export const getNativeUsdPrice = (anchorBasket, config) => {
  const anchor = positive(reserveOf(anchorBasket, config.anchor)?.priceinreserve);
  const native = positive(reserveOf(anchorBasket, config.native)?.priceinreserve);
  return anchor && native ? anchor.dividedBy(native) : null;
};

// Definitions must contain bestcurrencystate, including converter definitions.
// Return null for an unusable route, so another basket can still supply a price.
export const selectCurrencyPriceRoute = (currencyId, definition, baskets, nativeUsd, config) => {
  if (currencyId === config.anchor) return { kind: 'fixed', price: BigNumber(1) };
  if (currencyId === config.native) return { kind: 'native', price: positive(nativeUsd) };

  const ownReserves = definition?.bestcurrencystate?.reservecurrencies;
  if (Array.isArray(ownReserves) && ownReserves.length > 0) {
    const native = reserveOf(definition, config.native);
    if (native) {
      const price = positive(native.priceinreserve);
      const usd = positive(nativeUsd);
      return { kind: 'basket', referenceId: config.native, price: price && usd ? price.multipliedBy(usd) : null };
    }
    return {
      kind: 'basket',
      referenceId: config.anchor,
      price: positive(reserveOf(definition, config.anchor)?.priceinreserve),
    };
  }

  const select = (referenceId, usd) => {
    if (!positive(usd)) return null;
    let largestReserve = BigNumber(0);
    let route = null;
    (baskets || []).forEach((basket) => {
      const currency = positive(reserveOf(basket, currencyId)?.priceinreserve);
      const reference = reserveOf(basket, referenceId);
      const referencePrice = positive(reference?.priceinreserve);
      const amount = positive(reference?.reserves);
      if (currency && referencePrice && amount && amount.isGreaterThan(largestReserve)) {
        largestReserve = amount;
        route = {
          kind: 'reserve', basket, referenceId, price: referencePrice.dividedBy(currency).multipliedBy(usd),
        };
      }
    });
    return route;
  };

  return select(config.native, nativeUsd) || select(config.anchor, 1) || { price: null };
};

export const getCurrencyUsdPrice = (currencyId, definition, baskets, nativeUsd, config) => (
  selectCurrencyPriceRoute(currencyId, definition, baskets, nativeUsd, config).price
);

// Apply one fixed route to a historical state. Reuse today's bad-data checks.
export const getRouteUsdPrice = (route, state, nativeUsd) => {
  const {
    kind, config, referenceId, currencyId,
  } = route;
  if (kind === 'fixed') return BigNumber(1);
  if (kind === 'native') return getNativeUsdPrice({ bestcurrencystate: state }, config);
  const definition = { bestcurrencystate: state };
  const reference = positive(reserveOf(definition, referenceId)?.priceinreserve);
  const usd = referenceId === config.native ? positive(nativeUsd) : BigNumber(1);
  if (!reference || !usd) return null;
  if (kind === 'basket') return reference.multipliedBy(usd);
  const currency = positive(reserveOf(definition, currencyId)?.priceinreserve);
  return currency ? reference.dividedBy(currency).multipliedBy(usd) : null;
};
