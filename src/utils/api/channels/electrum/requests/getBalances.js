import { electrumRequest } from '../callCreators';
import BigNumber from "bignumber.js";

export const getOneBalance = (coinObj, activeUser) => {
  const callType = 'getbalance'
  let params = {}

  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id].electrum != null &&
    activeUser.keys[coinObj.id].electrum.addresses.length > 0
  ) {    
    params.address = activeUser.keys[coinObj.id].electrum.addresses[0];
  } else {
    throw new Error(
      "getBalances.js: Fatal mismatch error, " +
        activeUser.id +
        " user keys for active coin " +
        coinObj.id +
        " not found!"
    );
  }

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.electrum_endpoints, callType, params, coinObj.id)
    .then((response) => {
      resolve({
        ...response,
        result: response.result ? {
          ...response.result,
          confirmed: BigNumber(response.result.confirmed),
          unconfirmed: BigNumber(response.result.unconfirmed),
        } : response.result
      })
    })
    .catch((err) => {
      reject(err)
    })
  });
}
