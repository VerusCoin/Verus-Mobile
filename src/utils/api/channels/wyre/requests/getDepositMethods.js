import { getActiveWyrePaymentMethods, getActiveWyreRates } from "../callCreators";

export const getDepositSources = async (coinObj) => {
  const methods = await getActiveWyrePaymentMethods();
  
  if (methods == null) return null

  const rates = await getActiveWyreRates();
  const list = methods.list;
  const mapping = methods.mapping;

  return list
    .filter((methodId) => {
      return mapping[methodId].status === "ACTIVE" && mapping[methodId].supportsPayment;
    })
    .map((methodId) => {
      let currencies = {}

      mapping[methodId].chargeableCurrencies.map((currencyId) => {
        currencies[currencyId] = {
          sourceCurrencyId: currencyId,
          price:
            rates[currencyId] == null
              ? null
              : currencyId == coinObj.currency_id
              ? 1
              : rates[currencyId][coinObj.currency_id],
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
