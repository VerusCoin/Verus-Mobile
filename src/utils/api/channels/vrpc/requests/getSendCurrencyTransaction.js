import VrpcProvider from "../../../../vrpc/vrpcInterface";

export const getSendCurrencyTransaction = async (systemId, currency, amount, address, exportto, convertto, feecurrency, via) => {
  if (feecurrency !== systemId) throw new Error("Fee currencies different from system not yet supported.");

  return await VrpcProvider.getEndpoint(
    systemId,
  ).sendCurrency(
    '*',
    [
      {
        currency,
        amount,
        exportto,
        convertto,
        via,
        address,
      },
    ],
    1,
    0.0001,
    true,
  );
}