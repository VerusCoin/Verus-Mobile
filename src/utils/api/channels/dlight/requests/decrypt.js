import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const decryptData = async (alias, params) => {
  try {
    const plaintext = await Tools.decryptVerusData(
      params.ivkHex || null,
      params.ephemeralPublicKeyHex || null,
      params.ciphertextHex,
      params.symmetricKeyHex || null
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