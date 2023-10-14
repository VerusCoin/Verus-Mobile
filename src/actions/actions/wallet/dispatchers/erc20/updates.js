import { getStandardErc20Balance, getStandardErc20Transactions } from "../../../../../utils/api/channels/erc20/callCreator";
import { ERC20 } from "../../../../../utils/constants/intervalConstants";

export const updateErc20Balances = async (activeUser, coinObj) => {
  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id][ERC20] != null &&
    activeUser.keys[coinObj.id][ERC20].addresses.length > 0
  ) {
    const balance = (
      await getStandardErc20Balance(
        activeUser.keys[coinObj.id][ERC20].addresses[0],
        coinObj.currency_id,
        coinObj.decimals,
        coinObj.network
      )
    ).toString();

    return {
      chainTicker: coinObj.id,
      channel: ERC20,
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
}

export const updateErc20Transactions = async (activeUser, coinObj) => {
  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id][ERC20] != null &&
    activeUser.keys[coinObj.id][ERC20].addresses.length > 0
  ) {
    return {
      chainTicker: coinObj.id,
      channel: ERC20,
      header: {},
      body: await getStandardErc20Transactions(
        activeUser.keys[coinObj.id][ERC20].addresses[0],
        coinObj.currency_id,
        coinObj.decimals,
        coinObj.network
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
}