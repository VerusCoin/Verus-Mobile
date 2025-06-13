import {
  getInfo,
  getPrivateBalance,
  getZTransactions,
} from '../../../../../utils/api/channels/dlight/callCreators';
import {DLIGHT_PRIVATE} from '../../../../../utils/constants/intervalConstants';
import { standardizeDlightTxObj } from '../../../../../utils/standardization/standardizeTxObj';

export const updateDlightBalances = async (activeUser, coinObj) => {
  //console.error(">>>> updateDlightBalances called")
  const zBalances = await getPrivateBalance(
    coinObj.id,
    activeUser.accountHash,
    coinObj.proto,
  );

  const {result, ...header} = zBalances;
  //console.error("zBalances result = " + JSON.stringify(result));
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
  //console.log(">>>> updateDlightTransactions called")
  const zTransactions = await getZTransactions(
    coinObj.id,
    activeUser.accountHash,
    coinObj.proto,
    'all',
  );
  const {result, ...header} = zTransactions;
  //console.log("zTransactions result = " + JSON.stringify(result));
  //console.log("result.transactions = " + JSON.stringify(result.transactions));
  // TODO: below is redundant, just pass through without jsonRpc formatting from getZtx
  const transactions = result.transactions;
  // TODO: result.transactions is an array, standardize func returns a single txObj. batch instead
  const _txs = [];
  transactions.forEach(function(transaction) {
      let standardizedTxObj = standardizeDlightTxObj(transaction)
      //console.log("Standardized = " + JSON.stringify(standardizedTxObj));
      _txs.push(standardizedTxObj)
  })
  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: _txs,
  };
};