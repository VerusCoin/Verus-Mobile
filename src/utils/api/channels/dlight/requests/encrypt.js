import { Tools } from 'react-native-verus';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const encryptVerusData = async (address, data, returnSsk = false) => {
  try {
      const payload = await Tools.encryptVerusData(address, data, returnSsk);
      return payload;
  } catch (err) {
      throw err;
  }
}
