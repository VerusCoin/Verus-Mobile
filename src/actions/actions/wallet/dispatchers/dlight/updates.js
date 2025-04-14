import {
  getInfo,
  getPrivateBalance,
  getZTransactions,
} from '../../../../../utils/api/channels/dlight/callCreators';
import {DLIGHT_PRIVATE} from '../../../../../utils/constants/intervalConstants';
import { standardizeDlightTxObj } from '../../../../../utils/standardization/standardizeTxObj';

export const updateDlightBalances = async (activeUser, coinObj) => {
  console.error(">>>> updateDlightBalances called")
  const zBalances = await getPrivateBalance(
    coinObj.id,
    activeUser.accountHash,
    coinObj.proto,
  );

  const {result, ...header} = zBalances;
  console.error("zBalances result = " + JSON.stringify(result));
  const {confirmed, total, pending} = result;

  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: {
      confirmed: confirmed,
      pending: pending,
      total: total,
    },
  };
};

export const updateDlightInfo = async (activeUser, coinObj) => {
  const syncInfo = await getInfo(
    coinObj.id,
    activeUser.accountHash,
    coinObj.proto,
  );

  const {result, ...header} = syncInfo;

  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: result,
  };
};

export const updateDlightTransactions = async (activeUser, coinObj) => {
  console.error(">>>> updateDlightTransactions called")

  const zTransactions = await getZTransactions(
    coinObj.id,
    activeUser.accountHash,
    coinObj.proto,
    'all',
  );
  const {result, ...header} = zTransactions;

  console.error("zTransactions result = " + JSON.stringify(result));
  console.error("result.transactions = " + JSON.stringify(result.transactions));
  const transactions = result.transactions;
  //TODO: result.transactions is an array, standardize func returns a single txObj
  // Ethereum seems to handle in batches, need to see if we gain anything by that, here.

  const _txs = [];
  transactions.forEach(function(transaction) {
      let standardizedTxObj = standardizeDlightTxObj(transaction)
      console.error("Standardized = " + JSON.stringify(standardizedTxObj));
      _txs.push(standardizedTxObj)
  })
  //const standard = standardizeDlightTxObj(txObj)
  //console.error("Standardized = " + JSON.stringify(standard));

  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: _txs,
  };
};