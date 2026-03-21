import { Tools } from 'react-native-verus';

export const encryptVerusData = async (address, data, returnSsk = false) => {
  try {
    const addressStr = typeof address === 'string'
      ? address : address.toAddressString();

    const dataHex = Buffer.from(data).toString('hex');

    const payload = await Tools.encryptVerusData(addressStr, dataHex, returnSsk);

    return {
      result: {
        ephemeralPublicKey: Buffer.from(payload.ephemeralPublicKey, 'hex'),
        encryptedData:      Buffer.from(payload.encryptedData,      'hex'),
        symmetricKey: payload.symmetricKey
          ? Buffer.from(payload.symmetricKey, 'hex')
          : null,
      }
    };
  } catch (e) {
      throw new Error(`encrypt verus data failed ${e.message}`);
  }
};