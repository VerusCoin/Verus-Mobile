import { getOneBalance, getParsedTransactionList } from "../../../../../utils/api/channels/electrum/callCreators";
import { ELECTRUM } from "../../../../../utils/constants/intervalConstants";
import { satsToCoins } from "../../../../../utils/math";

export const updateElectrumBalances = async (activeUser, coinObj) => {
  const balances = await getOneBalance(coinObj, activeUser);

  const {result, ...header} = balances;
  const {confirmed, unconfirmed} = result;

  return {
    chainTicker: coinObj.id,
    channel: ELECTRUM,
    header,
    body: {
      confirmed:
        confirmed != null && !isNaN(confirmed)
          ? satsToCoins(confirmed).toString()
          : '0',
      pending:
        unconfirmed != null && !isNaN(unconfirmed)
          ? satsToCoins(unconfirmed).toString()
          : '0',
      total:
        unconfirmed != null &&
        !isNaN(unconfirmed) &&
        confirmed != null &&
        !isNaN(confirmed)
          ? satsToCoins(unconfirmed.plus(confirmed)).toString()
          : '0',
    },
  };
}

export const updateElectrumTransactions = async (activeUser, coinObj) => {
  const transactions = await getParsedTransactionList(coinObj, activeUser, 10);
  const {result, ...header} = transactions;

  return {
    chainTicker: coinObj.id,
    channel: ELECTRUM,
    header,
    body: result,
  };
};