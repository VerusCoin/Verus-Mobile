import { Tools } from 'react-native-verus'; 
import ApiException from '../../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const decryptVerusMessage = async (alias, params) => {
  try {
    const plaintext = await Tools.decryptVerusMessage(
      params.fvkHex || null,
      params.epkHex || null,
      params.ciphertextHex,
      params.sskHex || null
    );

    return {
      result: plaintext,
      err: false
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
}