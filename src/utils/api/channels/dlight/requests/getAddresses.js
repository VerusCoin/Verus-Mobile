import { makeDlightRequest } from '../callCreators'
import { DLIGHT_PRIVATE_ADDRESSES } from '../../../../constants/dlightConstants'
import { syncInstance } from '../state/synchronizer'
import { getSynchronizerInstance } from 'react-native-verus'

// Lists addresses associated with a light daemon wallet
export const getAddresses = async (coinId, accountHash, coinProto) => {
  console.log("getAddresses: accountHash(" + accountHash + "), coinId(" + coinId + ")")
  const synchronizer = getSynchronizerInstance(accountHash, coinId);
  let res, error = "";

 return new Promise((resolve, reject) => {
    synchronizer.deriveSaplingAddress()
    .then(res => {
      if (res.error != null) {
        reject(
          new ApiException(
            res.error.message,
            res.error.data,
            coinId,
            DLIGHT_PRIVATE,
            res.error.code
          )
        );
      } else {
        //console.log("before jsonResponse")
        //const jsonResponse = createJsonRpcResponse("1", res);
        //console.warn("getAddresses response: " + jsonResponse)
        resolve(res);
      }
    })
  })

  //const res = makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_ADDRESSES, [])
  //return res;
}

export const createJsonRpcResponse = (id, result, error) => {
  const response = {
    id: id,
  }

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  return JSON.stringify(response)
}
