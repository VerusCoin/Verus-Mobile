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
  const {confirmed, total} = result;

  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: {
      confirmed: confirmed,
      pending: total.minus(confirmed).toString(),
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

  return {
    chainTicker: coinObj.id,
    channel: DLIGHT_PRIVATE,
    header,
    body: result.map(standardizeDlightTxObj),
  };
};