import { standardizeWyreTxObj } from '../../../../standardization/standardizeTxObj';
import { getActiveWyreAccount, getActiveWyreTransfers } from '../callCreators';

export const getTransactions = async (coinObj) => {
  const transfers = await getActiveWyreTransfers();
  const account = await getActiveWyreAccount();

  if (transfers == null || account == null) {
    return [];
  } else {
    let processedTransfers = []

    for (const transfer of transfers) {
      if (transfer.sourceCurrency === coinObj.currency_id || transfer.destCurrency === coinObj.currency_id) {

        processedTransfers.push(
          standardizeWyreTxObj(transfer, account.depositAddresses[coinObj.currency_id], coinObj)
        );
      }
    }

    return processedTransfers
  }
};
