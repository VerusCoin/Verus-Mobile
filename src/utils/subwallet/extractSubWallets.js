import { arrayToObject } from "../objectManip"

// Extracts all sub wallets that didn't have an error on initialization
export const extractDisplaySubWallets = state => {
  return arrayToObject(
    Object.keys(state.coinMenus.allSubWallets),
    (curr, ticker) =>
      state.coinMenus.allSubWallets[ticker]
        .sort(function (x, y) {
          if (x.name < y.name) {
            return -1;
          }
          if (x.name > y.name) {
            return 1;
          }
          return 0;
        })
        .filter(wallet => {
          const uniqueChannels = Object.values(wallet.api_channels).filter(
            (item, i, ar) => ar.indexOf(item) === i,
          );

          return uniqueChannels.every(
            channel =>
              state.errors[`init_${channel}_errors`] == null ||
              state.errors[`init_${channel}_errors`][ticker] == null,
          );
        }),
    true,
  );
};