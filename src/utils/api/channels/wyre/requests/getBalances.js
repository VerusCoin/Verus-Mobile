import BigNumber from 'bignumber.js';
import { getActiveWyreAccount } from '../callCreators';

export const getBalance = async (coinObj) => {
  const account = await getActiveWyreAccount();

  if (account == null) {
    return {
      confirmed: BigNumber(0),
      pending: BigNumber(0),
      total: BigNumber(0),
    };
  } else {
    const { totalBalances, availableBalances } = account;
    const totalBalance =
      totalBalances[coinObj.currency_id] == null ? BigNumber(0) : BigNumber(totalBalances[coinObj.currency_id]);
    const availableBalance =
      availableBalances[coinObj.currency_id] == null
        ? BigNumber(0)
        : BigNumber(availableBalances[coinObj.currency_id]);

    return {
      confirmed: availableBalance,
      pending: totalBalance.minus(availableBalance),
      total: totalBalance,
    };
  }
};
