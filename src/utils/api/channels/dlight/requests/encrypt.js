import { Tools } from 'react-native-verus'; 



/**
 * Encrypts data using a Verus z-address.
 *
 * @param {string} address - The Verus z-address to encrypt data for.
 * @param {string} dataHex - The hex-encoded data to encrypt.
 * @param {boolean} [returnSsk=false] - Whether to return the shared secret key.
 * @returns {Promise<{result: any, err: false}>} The encrypted payload.
 * @throws {Error} If encryption fails.
 */
export const encryptData = async (address, dataHex, returnSsk = false) => {
  try {
    const payload = await Tools.encryptVerusData(address, dataHex, returnSsk);

    return payload;
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}