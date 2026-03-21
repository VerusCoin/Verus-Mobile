import { Tools } from 'react-native-verus';

export const decryptVerusData = async (ivk, epk, dataToDecrypt, ssk) => {
  try {

    const plaintext = await Tools.decryptVerusData(ivk, epk, dataToDecrypt, ssk);

    return plaintext;
  } catch (e) {
      throw new Error(`decrypt verus data failed ${e.message}`);
  }
};