import { arrayToObject } from "../objectManip"

export const extractData = (state, statePath, apiCallKey) => {
  return arrayToObject(
    Object.keys(state.coinMenus.allSubWallets),
    (curr, key) =>
      arrayToObject(
        state.coinMenus.allSubWallets[key].map((wallet) => wallet.id),
        (_curr, _key) => state[statePath[0]][statePath[1]][
            state.coinMenus.allSubWallets[key].find((w) => w.id === _key).api_channels[apiCallKey]
          ][key],
        true
      ),
    true
  );
};

export const extractLedgerData = (state, dataKey, apiCallKey) => {
  return extractData(state, ['ledger', dataKey], apiCallKey)
}

export const extractErrorData = (state, apiCallKey) => {
  return extractData(state, ['errors', apiCallKey], apiCallKey)
}