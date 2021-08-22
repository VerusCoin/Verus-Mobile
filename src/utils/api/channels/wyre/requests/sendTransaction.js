import WyreProvider from "../../../../services/WyreProvider"

export const send = async (coinObj, activeUser, address, amount, params) => {
  try {
    const res = await WyreProvider.sendTransaction({
      transferId: params.transferId
    })
    
    return {
      err: false,
      result: {
        fee: res.totalFees,
        value: res.destAmount.toString(),
        toAddress: address,
        fromAddress: `Wyre ${coinObj.id} wallet`,
        amountSubmitted: amount.toString(),
        memo: res.message,
        params: {},
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