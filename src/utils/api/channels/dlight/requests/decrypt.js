import { Tools } from 'react-native-verus'; 

export const decryptData = async (params) => {
  try {
    const plaintext = await Tools.decryptVerusData(
      params.ivkHex || null,
      params.ephemeralPublicKeyHex || null,
      params.ciphertextHex,
      params.symmetricKeyHex || null
    );

    return plaintext;
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}