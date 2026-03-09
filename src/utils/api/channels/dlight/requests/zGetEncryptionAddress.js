import { Tools } from 'react-native-verus';
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';

export const z_getencryptionaddress = async (alias, params) => {
  try {
    const extskHex = params.extsk 
      ? await Tools.bech32Decode(params.extsk)  
      : null;

    const keys = await Tools.getVerusEncryptionAddress({
      mnemonicSeed: params.mnemonicSeed ?? null,
      extsk:        extskHex,
      fromId:       params.fromId  ?? null,
      toId:         params.toId    ?? null,
      hdIndex:      params.hdIndex ?? -1,
      encryptionIndex: params.encryptionIndex ?? 0,
      returnSecret: params.returnSecret ?? false,
    });

    return { result: keys };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
};