import { Tools } from 'react-native-verus';

export const decrypt_verus_data = async (alias, params) => {
  try {
    const ivkHex = params.ivk instanceof Buffer
      ? params.ivk.toString('hex')
      : params.ivk ?? null;

    const epkHex = params.epk instanceof Buffer
      ? params.epk.toString('hex')
      : params.epk ?? null;

    const dataHex = params.data instanceof Buffer
      ? params.data.toString('hex')
      : params.data;

    const sskHex = params.ssk
      ? (params.ssk instanceof Buffer ? params.ssk.toString('hex') : params.ssk)
      : null;

    const plaintext = await Tools.decryptVerusData(ivkHex, epkHex, dataHex, sskHex);

    return { result: Buffer.from(plaintext, 'hex') };
  } catch (e) {
      throw new Error(`decrypt verus data failed ${e.message}`);
  }
};