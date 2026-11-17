import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';

// The money value of amounts in one or more currencies. `getRate` returns the
// display-currency price of a currency ID, or null. One missing price makes
// the whole sum unknown, so a partial sum never shows as the total.
export const sumMoney = (items, getRate) => {
  if (!items.length) return null;

  let total = BigNumber(0);
  for (const item of items) {
    const amount = BigNumber(item.amount);
    const rate = BigNumber(getRate(item.currencyId) ?? NaN);
    if (!amount.isFinite() || !rate.isFinite() || !rate.isGreaterThan(0)) {
      return null;
    }
    total = total.plus(amount.multipliedBy(rate));
  }
  return total;
};

// A money value without a sign, as the pay and receive nodes show it.
export const formatMoney = (value, displayCurrency) => {
  if (value == null) return null;

  const money = BigNumber(value);
  if (!money.isFinite() || money.isNegative()) return null;
  return formatCurrency({amount: money.decimalPlaces(2).toFixed(2), code: displayCurrency})[0];
};

// "≈ €6,98". A positive value under half a cent reads "< €0,01", because
// "€0,00" would say that a fee is free.
export const formatApproxMoney = (value, displayCurrency) => {
  if (value == null) return null;

  const money = BigNumber(value);
  if (!money.isFinite() || money.isNegative()) return null;

  if (money.isGreaterThan(0) && money.decimalPlaces(2).isZero()) {
    return `< ${formatMoney('0.01', displayCurrency)}`;
  }
  return `≈ ${formatMoney(money, displayCurrency)}`;
};
