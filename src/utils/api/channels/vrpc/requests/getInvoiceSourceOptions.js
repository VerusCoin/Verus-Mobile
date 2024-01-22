import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { getCurrencyConverters } from "./getCurrencyConverters";

export const getInvoiceSourceOptions = async (convertto, amount, systemIds = [], currencyIds = [], maxSlippage = 1) => {
  const retVal = new Map();

  for (const systemId of systemIds) {
    if (VrpcProvider.isSystemIdActivated(systemId)) {
      const converterRes = await getCurrencyConverters(systemId, {
        convertto,
        fromcurrency: currencyIds.map(x => { return { currency: x }}),
        amount,
        slippage: maxSlippage
      })

      if (converterRes.result) {
        retVal.set(systemId, converterRes.result)
      }
    }
  }

  return retVal
}