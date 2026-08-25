import BigNumber from "bignumber.js";

export const validateCurrencyTransferSpendDeltas = ({
  currency,
  deltas,
  feeCurrency,
  systemId,
}) => {
  const allowedSpendCurrencies = new Set([
    currency,
    feeCurrency == null ? systemId : feeCurrency,
  ]);

  deltas.forEach((value, currencyId) => {
    if (
      !allowedSpendCurrencies.has(currencyId) &&
      BigNumber(value).isLessThan(0)
    ) {
      throw new Error("Can only spend either fee currency or sent currency.");
    }
  });
};
