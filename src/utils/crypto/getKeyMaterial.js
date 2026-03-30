/**
 * getKeyMaterial.js
 *
 * Shared utility to retrieve an extended spending key (extsk) for Sapling
 * encryption operations. Used by both appEncryptionRequestHandler and
 * encryptCredentials.
 */

import { CoinDirectory } from "../CoinData/CoinDirectory";
import { requestPrivKey } from "../auth/authBox";
import { DLIGHT_PRIVATE } from "../constants/intervalConstants";
import { Tools } from "react-native-verus";

/**
 * Gets an extended spending key for zGetEncryptionAddress.
 * The stored key may be bech32-encoded (secret-extended-key-main...).
 * The iOS native module expects raw hex, so we decode bech32 keys here.
 *
 * @param {string} systemID - Coin system ID (e.g. 'VRSC')
 * @returns {Promise<{extsk: string}>} extsk as hex string
 * @throws {Error} If no key material can be retrieved
 */
export const getKeyMaterial = async (systemID) => {
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  try {
    const esk = await requestPrivKey(coinObj.id, DLIGHT_PRIVATE);
    if (esk) {
      // The stored key is bech32-encoded; the iOS native module's
      // zGetEncryptionAddress expects hex bytes.  Decode here so all
      // consumers receive a hex spending key.
      const hex = esk.startsWith("secret-extended-key-")
        ? await Tools.bech32Decode(esk)
        : esk;
      return { extsk: hex };
    }
  } catch (e) {}

  throw new Error(
    `No Z (shielded address) seed has been set up. ` +
    `Please go to Settings → Profile and set up a Z Seed before accepting encryption requests.`
  );
};
