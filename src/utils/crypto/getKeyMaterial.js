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
import { spendingKeyHex } from "./spendingKeyHex";
import store from "../../store";

export { spendingKeyHex } from "./spendingKeyHex";

const MISSING_KEY_MESSAGE =
  "No Z (shielded address) seed has been set up. " +
  "Please go to Settings → Profile and set up a Z Seed before accepting encryption requests.";

/**
 * Gets an extended spending key for zGetEncryptionAddress.
 * The stored key may be bech32-encoded (secret-extended-key-main...).
 * Both native bridges expect raw hex, so we decode Bech32 keys here.
 *
 * @param {string} systemID - Coin system ID (e.g. 'VRSC')
 * @param {object} requestContext - Optional session scope for private key access
 * @returns {Promise<{extsk: string}>} extsk as hex string
 * @throws {Error} If no key material can be retrieved
 */
export const getKeyMaterial = async (systemID, requestContext = null) => {
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  requestContext?.assertActive?.();

  const { activeAccount, sessionKey } = store.getState().authentication;

  if (activeAccount && sessionKey && !activeAccount.keys?.[coinObj.id]?.[DLIGHT_PRIVATE]) {
    throw new Error(MISSING_KEY_MESSAGE);
  }

  // Authentication and session errors must retain their original meaning.
  const esk = await requestPrivKey(coinObj.id, DLIGHT_PRIVATE, requestContext);
  requestContext?.assertActive?.();

  if (esk) {
    return { extsk: spendingKeyHex(esk) };
  }

  throw new Error(MISSING_KEY_MESSAGE);
};
