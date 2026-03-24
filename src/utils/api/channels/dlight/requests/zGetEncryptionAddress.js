import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'


/**
 * Calls Tools.getVerusEncryptionAddress with a ChannelKeysRequest object.
 * @param {string} alias - The coin system ID
 * @param {object} params - ChannelKeysRequest: { mnemonicSeed?, extsk?, fromId?, toId?, hdIndex?, encryptionIndex?, returnSecret? }
 * @returns {Promise<{result?: object, err?: boolean}>}
 */
export const z_getencryptionaddress = async (alias, params) => {
  try {
    const keys = await Tools.getVerusEncryptionAddress({
      mnemonicSeed: params.mnemonicSeed || null,
      extsk: params.extsk || null,
      fromId: params.fromId || null,
      toId: params.toId || null,
      hdIndex: params.hdIndex ?? -1,
      encryptionIndex: params.encryptionIndex ?? 0,
      returnSecret: params.returnSecret ?? false,
    });

    return { result: keys };
  } catch (e) {
    return {
      err: e?.message || String(e),
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    }
  }
}