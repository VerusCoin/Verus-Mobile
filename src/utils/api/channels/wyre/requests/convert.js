import WyreProvider from "../../../../services/WyreProvider"

export const convert = async (coinObj, activeUser, from, to, address, amount, params) => {
  try {
    const res = await WyreProvider.sendTransaction({
      transferId: params.transferId
    })
    
    return {
      err: false,
      result: {
        fees: res.totalFees,
        valueSent: res.sourceAmount.toString(),
        valueReceived: res.destAmount.toString(),
        price: res.exchangeRate,
        toAddress: `Wyre ${res.destCurrency} wallet`,
        fromAddress: `Wyre ${res.sourceCurrency} wallet`,
        amountSubmitted: amount.toString(),
        memo: res.message,
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