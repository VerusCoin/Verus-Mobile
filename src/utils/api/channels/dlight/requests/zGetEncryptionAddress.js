import { Tools } from 'react-native-verus'; 
import ApiException from '../../../../errors/apiError'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'


export const z_getencryptionaddress = async (alias, params) => {
  try {
    const keys = await Tools.getVerusEncryptionAddress(
      params.seed || null,
      params.spendingKey || null,
      params.fromId || null,
      params.toId || null,
      params.hdIndex || 0,
      params.encryptionIndex || 0,
      params.returnSecret || false
    );

    return { result: keys };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    }
  }
}