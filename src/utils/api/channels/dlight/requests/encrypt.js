import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const encryptData = async (alias, address, dataHex, returnSsk = false) => {
  try {
    const payload = await Tools.encryptVerusData(address, dataHex, returnSsk);

    return {
      result: payload,
      err: false
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
}