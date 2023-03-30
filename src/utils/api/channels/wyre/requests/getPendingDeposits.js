import { getActiveWyreTransfers } from "../callCreators";
import { getTransferFollowup } from "./getTransferFollowup";

export const getPendingDeposits = async (coinObj) => {
  const transfers = await getActiveWyreTransfers();
  const list = (transfers == null ? [] : transfers);
  let processedDeposits = []

  for (const transfer of list) {
    if (
      transfer.status == "PENDING" &&
      transfer.source.split(":")[0] === "paymentmethod" &&
      transfer.destCurrency === coinObj.currency_id
    ) {
      try {
        const processedDeposit = await getTransferFollowup({ transferId: transfer.id });

        processedDeposits.push({
          transfer,
          followup:
            processedDeposit.chargeInfo == null ? null : processedDeposit.chargeInfo.wireDetails,
        });
      } catch (e) {
        console.warn(e);

        processedDeposits.push({
          transfer,
          followup: null
        })
      }
    }
  }

  return processedDeposits
};
