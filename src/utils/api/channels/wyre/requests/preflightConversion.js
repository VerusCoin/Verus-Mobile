import WyreProvider from "../../../../services/WyreProvider"

export const preflightConversion = async (coinObj, activeUser, from, to, address, amount, params) => {
  try {
    const accountSrn = WyreProvider.getAccountSrn()

    const res = await WyreProvider.preflightTransaction({
      source: accountSrn,
      sourceCurrency: from.id,
      sourceAmount: amount.toString(),
      dest: accountSrn,
      destCurrency: to.id,
      message: params.memo,
    });

    return {
      err: false,
      result: {
        fee: res.totalFees,
        valueSent: res.sourceAmount.toString(),
        valueReceived: res.destAmount.toString(),
        price: res.exchangeRate,
        toAddress: `Wyre ${res.destCurrency} wallet`,
        fromAddress: `Wyre ${res.sourceCurrency} wallet`,
        amountSubmitted: amount.toString(),
        memo: res.message,
        fromCurrency: res.sourceCurrency,
        toCurrency: res.destCurrency,
        params: {
          transferId: res.id,
        },
      },
    };
  } catch (e) {
    console.error(e);

    return {
      err: true,
      result: e.message,
    };
  }
};