import { arrayToObject } from "../objectManip"

export const extractData = (state, statePath, apiCallKey, chainTicker) => {
  return chainTicker != null
    ? state.coinMenus.allSubWallets[chainTicker] == null
      ? {}
      : arrayToObject(
          state.coinMenus.allSubWallets[chainTicker].map((wallet) => wallet.id),
          (_curr, _key) =>
            state[statePath[0]][statePath[1]][
              state.coinMenus.allSubWallets[chainTicker].find(
                (w) => w.id === _key
              ).api_channels[apiCallKey]
            ][chainTicker],
          true
        )
    : arrayToObject(
        Object.keys(state.coinMenus.allSubWallets),
        (curr, key) =>
          arrayToObject(
            state.coinMenus.allSubWallets[key].map((wallet) => wallet.id),
            (_curr, _key) =>
              state[statePath[0]][statePath[1]][
                state.coinMenus.allSubWallets[key].find((w) => w.id === _key)
                  .api_channels[apiCallKey]
              ][key],
            true
          ),
        true
      );
};

export const extractLedgerData = (state, dataKey, apiCallKey, chainTicker) => {
  return extractData(state, ['ledger', dataKey], apiCallKey, chainTicker)
}

export const extractErrorData = (state, apiCallKey, chainTicker) => {
  return extractData(state, ['errors', apiCallKey], apiCallKey, chainTicker)
}