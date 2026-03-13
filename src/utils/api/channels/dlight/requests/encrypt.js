import { Tools } from 'react-native-verus';
import { SaplingPaymentAddress } from 'verus-typescript-primitives';

export const encrypt_verus_data = async (alias, address, data, returnSsk = false) => {
  try {
    const addressStr = typeof address === 'string'
      ? address
      : (() => {
          const addr = new SaplingPaymentAddress();
          addr.d    = Buffer.from(address.d.type === 'Buffer' ? address.d.data    : address.d);
          addr.pk_d = Buffer.from(address.pk_d.type === 'Buffer' ? address.pk_d.data : address.pk_d);
          return addr.toAddressString();
    })();

    const dataHex = data instanceof Buffer
      ? data.toString('hex')
      : Buffer.from(data).toString('hex');

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