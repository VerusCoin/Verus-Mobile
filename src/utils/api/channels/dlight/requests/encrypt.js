import { Tools } from 'react-native-zcash';
import ApiException from '../../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const encryptVerusMessage = async (address, message, returnSsk = false) => {
  try {
      const payload = await Tools.encryptVerusMessage(address, message, returnSsk);
      return payload;
  } catch (err) {
      throw err;
  }
}