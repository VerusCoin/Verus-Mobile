import { Tools } from 'react-native-verus'; 

/**
 * Calls Tools.getVerusEncryptionAddress with a ChannelKeysRequest object.
 * @param {string} alias - The coin system ID
 * @param {object} params - ChannelKeysRequest: { mnemonicSeed?, extsk?, fromId?, toId?, hdIndex?, encryptionIndex?, returnSecret? }
 * @returns {Promise<{result?: object, err?: boolean}>}
 */
export const zGetEncryptionAddress = async (alias, params) => {
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

    return keys;
  } catch (e) {
    throw e;
  }
}