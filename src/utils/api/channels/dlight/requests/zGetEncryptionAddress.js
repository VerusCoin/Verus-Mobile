import { Tools } from 'react-native-verus'; 
import ApiException from '../../../errors/apiError'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'
import { decodeDestination } from 'verus-typescript-primitives';

export const z_getencryptionaddress = async (alias, params) => {
  try {
    const keys = await Tools.getVerusEncryptionAddress(
      params.seed ? Buffer.from(params.seed).toString('hex') : null,
      params.spendingKey ? Buffer.from(params.spendingKey).toString('hex') : null,
      params.fromId ? decodeDestination(params.fromId).toString('hex') : null,  // hash160 Buffer → hex
      params.toId ? decodeDestination(params.toId).toString('hex') : null,
      params.hdIndex || 0,
      params.encryptionIndex || 0,
      params.returnSecret || false
    );

    // keys come back with hex strings, convert to Buffers for consumers
    return {
      result: {
        address: Bkeys.address,                              // stays as string (bech32)
        ivk: keys.ivk ? Buffer.from(keys.ivk, 'hex') : null,         // hex → Buffer(32)
        extfvk: keys.fvkHex ? Buffer.from(keys.extfvk, 'hex') : null,   // hex → Buffer(169)
        spending_key: keys.spendingKey ? Buffer.from(keys.spendingKey, 'hex') : null
      }
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    }
  }
}