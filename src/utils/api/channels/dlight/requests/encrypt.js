import { Tools } from 'react-native-verus';
import ApiException from '../../../errors/apiError';
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants';

export const encrypt_verus_data = async (alias, address, data, returnSsk = false) => {
  try {
    const addressStr = typeof address === 'string'
      ? address
      : address.toAddressString();          

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
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
};

/*
export const encrypt_verus_data = async (alias, address, data, returnSsk = false) => {
  try {
    const addressHex = address instanceof Buffer 
      ? address.toString('hex') 
      : Buffer.from(address).toString('hex');

    const dataHex = data instanceof Buffer 
      ? data.toString('hex') 
      : Buffer.from(data).toString('hex');

    const payload = await Tools.encryptVerusData(
      addressHex,
      dataHex,
      returnSsk
    );

    return {
      result: {
        ephemeralPublicKey: Buffer.from(payload.ephemeralPublicKey, 'hex'),
        encryptedData: Buffer.from(payload.encryptedData, 'hex'),
        symmetricKey: payload.symmetricKey 
          ? Buffer.from(payload.symmetricKey, 'hex') 
          : null
      }
    };
  } catch (e) {
    return {
      err: true,
      result: new ApiException(e.message, e.data, alias, DLIGHT_PRIVATE, e.code)
    };
  }
};*/