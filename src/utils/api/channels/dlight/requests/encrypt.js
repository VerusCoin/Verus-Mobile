import { Tools } from 'react-native-zcash';
import ApiException from '../../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const encryptVerusMessage = async (alias, address, message, returnSsk = false) => {
  try {
    const payload = await Tools.encryptVerusMessage(address, message, returnSsk);

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