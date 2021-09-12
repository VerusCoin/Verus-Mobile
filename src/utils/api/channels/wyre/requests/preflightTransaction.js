import BigNumber from "bignumber.js"
import WyreProvider from "../../../../services/WyreProvider"
import WyreService from "../../../../services/WyreService"

export const txPreflight = async (coinObj, activeUser, address, amount, params) => {
  try {
    const res = await WyreProvider.preflightTransaction({
      source: WyreProvider.getAccountSrn(),
      sourceCurrency: coinObj.id,
      sourceAmount: params.amountAsDest ? undefined : amount.toString(),
      destAmount: !params.amountAsDest ? undefined : amount.toString(),
      dest: address.includes(":") ? address : WyreService.formatCryptoSrn(coinObj, address),
      destCurrency: params.destCurrency == null ? coinObj.id : params.destCurrency,
      message: params.memo,
    });
    
    return {
      err: false,
      result: {
        fee: res.totalFees != null ? res.totalFees.toString() : "0",
        value: res.destAmount.toString(),
        toAddress: address,
        fromAddress: `Wyre ${coinObj.id} wallet`,
        fromCurrency: res.sourceCurrency,
        toCurrency: res.destCurrency,
        price: res.exchangeRate,
        sourceAmount: res.sourceAmount.toString(),
        destAmount: res.destAmount.toString(),
        amountSubmitted: amount.toString(),
        balanceDelta: BigNumber(res.sourceAmount).multipliedBy(-1),
        memo: res.message,
        params: {
          transferId: res.id,
        },
      },
    };
  } catch(e) {
    console.error(e)

    return {
      err: true,
      result: e.message
    }
  }
}