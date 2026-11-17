import BigNumber from "bignumber.js";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const estimateConversion = (systemId, currency, convertto, amount, via, preconvert) => {
  // Convert only at the RPC boundary, without losing decimal precision.
  const value = BigNumber(amount);
  const numericAmount = value.toNumber();
  if (!value.isFinite() || !value.isEqualTo(numericAmount)) {
    throw new Error("Invalid conversion estimate amount.");
  }

  return VrpcProvider.getEndpoint(systemId).estimateConversion({
    currency,
    convertto,
    amount: numericAmount,
    ...(via != null ? {via} : {}),
    ...(preconvert != null ? {preconvert} : {}),
  })
}
