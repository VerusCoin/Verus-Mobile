import BigNumber from "bignumber.js";
import WyreProvider from "../../../../services/WyreProvider"

export const send = async (coinObj, activeUser, address, amount, passthrough) => {
  try {
    const res = await WyreProvider.sendTransaction({
      transferId: passthrough.params.transferId,
    });
    
    return {
      err: false,
      result: {
        fee: res.totalFees != null ? res.totalFees.toString() : "0",
        value: res.destAmount.toString(),
        toAddress: address,
        fromAddress: `Wyre ${coinObj.id} wallet`,
        amountSubmitted: amount.toString(),
        balanceDelta: BigNumber(res.sourceAmount).multipliedBy(-1),
        memo: res.message,
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