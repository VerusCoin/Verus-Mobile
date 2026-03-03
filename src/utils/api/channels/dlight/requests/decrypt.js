import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';


export const decrypt_verus_data = async (alias, params) => {
  try {
    const plaintext = await Tools.decryptVerusData(
      params.ivkHex ? params.ivkHex.toString('hex') : null,
      params.epkHex ? params.epkHex.toString('hex') : null,
      params.dataToEncrypt.toString('hex'),
      params.sskHex ? params.sskBytes.toString('hex') : null
    );

    return {
      result: Buffer.from(decryptedData, 'hex'),
      err: false
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
}