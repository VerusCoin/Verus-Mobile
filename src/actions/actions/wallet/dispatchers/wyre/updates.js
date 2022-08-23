import {getBalance, getTransactions} from '../../../../../utils/api/channels/wyre/callCreators';
import {getRates} from '../../../../../utils/api/channels/wyre/requests/getRates';
import {getConversionPaths} from '../../../../../utils/api/routers/getConversionPaths';
import {getDepositSources} from '../../../../../utils/api/routers/getDepositSources';
import {getPendingDeposits} from '../../../../../utils/api/routers/getPendingDeposits';
import { getWithdrawDestinations } from '../../../../../utils/api/routers/getWithdrawDestinations';
import {WYRE_SERVICE} from '../../../../../utils/constants/intervalConstants';

export const updateWyreBalances = async coinObj => {
  const balances = await getBalance(coinObj);

  return {
    chainTicker: coinObj.id,
    channel: WYRE_SERVICE,
    header: {},
    body: {
      confirmed: balances.confirmed.toString(),
      pending: balances.pending.toString(),
      total: balances.total.toString(),
    },
  };
};

export const updateWyreConversionPaths = async coinObj => {
  const paths = await getConversionPaths(coinObj, WYRE_SERVICE);

  return {
    chainTicker: coinObj.id,
    channel: WYRE_SERVICE,
    header: {},
    body: paths,
  };
};

export const updateWyreDepositSources = async coinObj => {
  try {
    const sources = await getDepositSources(coinObj, WYRE_SERVICE);
    return {
      chainTicker: coinObj.id,
      channel: WYRE_SERVICE,
      header: {},
      body: sources,
    };
  } catch (e) {
    console.warn(e);
    throw e;
  }
};

export const updateWyreFiatPrices = async coinObj => {
  let body = await getRates(coinObj);

  return {
    chainTicker: coinObj.id,
    channel: WYRE_SERVICE,
    header: {},
    body,
  };
};

export const updateWyrePendingDeposits = async coinObj => {
  try {
    const deposits = await getPendingDeposits(coinObj, WYRE_SERVICE);
    return {
      chainTicker: coinObj.id,
      channel: WYRE_SERVICE,
      header: {},
      body: deposits,
    };
  } catch (e) {
    console.warn(e);
    throw e;
  }
};

export const updateWyreTransactions = async coinObj => {
  return {
    chainTicker: coinObj.id,
    channel: WYRE_SERVICE,
    header: {},
    body: await getTransactions(coinObj),
  };
};

export const updateWyreWithdrawalDestinations = async coinObj => {
  try {
    const destinations = await getWithdrawDestinations(coinObj, WYRE_SERVICE);
    return {
      chainTicker: coinObj.id,
      channel: WYRE_SERVICE,
      header: {},
      body: destinations,
    };
  } catch (e) {
    console.warn(e);
    throw e;
  }
};