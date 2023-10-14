import VrpcProvider from "../../../../vrpc/vrpcInterface";

export const getSendCurrencyTransaction = async (
  systemId,
  currency,
  amount,
  address,
  exportto,
  convertto,
  feecurrency,
  via,
  source = '*',
) => {
  const params = {
    currency,
    amount,
    exportto,
    convertto,
    via,
    address,
  };

  if (feecurrency != null) params.feecurrency = feecurrency;

  return await VrpcProvider.getEndpoint(systemId).sendCurrency(
    source,
    [
      params
    ],
    1,
    0.0001,
    true,
  );
};
