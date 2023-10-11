import BigNumber from "bignumber.js";
import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { getCurrency } from "../../verusid/callCreators";
import { coinsToSats } from "../../../../math";

export const calculateCurrencyTransferFee = async (systemId, currency, exportto, convertto, feecurrency, via, source, address) => {
  if (feecurrency !== systemId && exportto == null) {
    return "25000";
  } else {
    const { error, result: destinationSystem } = await getCurrency(systemId, exportto);

    if (error) throw new Error(error.message);

    const params = {
      currency,
      amount: 0,
      exportto,
      convertto,
      via,
      address
    }

    if (feecurrency != null) params.feecurrency = feecurrency;

    const sendCurrencyResponse = await VrpcProvider.getEndpoint(systemId).sendCurrency(source, [params], 1, 0.0001, true);

    if (sendCurrencyResponse.error) throw new Error(sendCurrencyResponse.error.message);

    const feeamount = sendCurrencyResponse.result.outputtotals[feecurrency];

    if (feeamount) return (coinsToSats(BigNumber(feeamount)).toString())
    else throw new Error("Couldn't find fee amount.")
  }
}