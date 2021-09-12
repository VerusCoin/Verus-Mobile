import { getActiveWyrePaymentMethods, getActiveWyreRates } from "../callCreators";

export const getWithdrawDestinations = async (coinObj) => {
  const methods = await getActiveWyrePaymentMethods();
  const rates = await getActiveWyreRates();
  const list = (methods == null ? [] : methods.list);
  const mapping = (methods == null ? {} : methods.mapping);

  return list
    .filter((methodId) => {
      return mapping[methodId].status === "ACTIVE" && mapping[methodId].supportsDeposit;
    })
    .map((methodId) => {
      let currencies = {}

      mapping[methodId].depositableCurrencies.map((currencyId) => {
        currencies[currencyId] = {
          destinationCurrencyId: currencyId,
          price:
            rates[coinObj.id] == null
              ? null
              : currencyId == coinObj.id
              ? 1
              : rates[coinObj.id][currencyId],
        };
      });
      
      return {
        displayName: mapping[methodId].name,
        id: mapping[methodId].id,
        destinationId: `paymentmethod:${mapping[methodId].id}`,
        minAmount: mapping[methodId].minDeposit,
        maxAmount: mapping[methodId].maxDeposit,
        currencies,
        countryCode: mapping[methodId].countryCode,
        description: mapping[methodId].nameOnMethod
      };
    });
};
