import {getStandardEthBalance, getStandardEthTransactions} from '../../../../../utils/api/channels/eth/callCreator';
import {ETH} from '../../../../../utils/constants/intervalConstants';

export const updateEthBalances = async (activeUser, coinObj) => {
  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id][ETH] != null &&
    activeUser.keys[coinObj.id][ETH].addresses.length > 0
  ) {
    const balance = (
      await getStandardEthBalance(activeUser.keys[coinObj.id][ETH].addresses[0])
    ).toString();

    return {
      chainTicker: coinObj.id,
      channel: ETH,
      header: {},
      body: {
        confirmed: balance,
        pending: '0',
        total: balance,
      },
    };
  } else {
    throw new Error(
      'updateBalances.js: Fatal mismatch error, ' +
        activeUser.id +
        ' user keys for active coin ' +
        coinObj.display_ticker +
        ' not found!',
    );
  }
};

export const updateEthTransactions = async (activeUser, coinObj) => {
  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id][ETH] != null &&
    activeUser.keys[coinObj.id][ETH].addresses.length > 0
  ) {
    return {
      chainTicker: coinObj.id,
      channel: ETH,
      header: {},
      body: await getStandardEthTransactions(
        activeUser.keys[coinObj.id][ETH].addresses[0],
      ),
    };
  } else {
    throw new Error(
      'updateTransactions.js: Fatal mismatch error, ' +
        activeUser.id +
        ' user keys for active coin ' +
        coinObj.display_ticker +
        ' not found!',
    );
  }
};