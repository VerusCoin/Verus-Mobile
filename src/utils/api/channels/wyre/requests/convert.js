import WyreProvider from "../../../../services/WyreProvider"

export const convert = async (coinObj, activeUser, from, to, address, amount, passthrough) => {
  try {
    const res = await WyreProvider.sendTransaction({
      transferId: passthrough.params.transferId
    })
    
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
        txid: res.id,
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