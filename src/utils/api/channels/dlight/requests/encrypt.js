import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';

export const encrypt_verus_data = async (alias, address, data, returnSsk = false) => {
  try {
    const payload = await Tools.encryptVerusData(
      addressBytes instanceof Buffer ? address.toString('hex') : Buffer.from(address).toString('hex'),
      data instanceof Buffer ? data: Buffer.from(address)/toString('hex'),
      returnSsk
    );

    return {
      result: {
        ephemeralPublicKey: Buffer.from(payload.ephemeralPublicKey, 'hex'),
        encryptdData: Buffer.from(payload.encryptdData, 'hex'),
        symmetricKey: payload.symmetricKey ? Buffer.from(payload.symmetricKey, 'hex') : null
      },
      err: false
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
}