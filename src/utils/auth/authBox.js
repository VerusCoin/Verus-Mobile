// This is where you can retrieve private keys and seeds,
// provided you pass the required authentication checks
// This only works if a user is logged in

import store from "../../store";
import { CHANNELS } from "../constants/intervalConstants";
import { randomBytes } from "../crypto/randomBytes";
import { getSessionPassword, setSessionPassword } from "../keychain/keychain";
import { arrayToObject } from "../objectManip";
import { decryptkey, encryptkey } from "../seedCrypt";

// Saves the session password to the keychain and returns the 
// session key
export const initSession = async (password) => {
  const sessionKey = (await randomBytes(32)).toString('hex')
  const sessionPass = await encryptkey(sessionKey, password)
  await setSessionPassword(sessionPass)

  return sessionKey
}

export const requestPassword = async () => {
  const state = store.getState()

  if (
    state.authentication.activeAccount == null || 
    state.authentication.sessionKey == null
  ) {
    throw new Error("You must be signed in to retrieve sensitive info");
  } else {
    const sessionPass = await getSessionPassword()
    const password = decryptkey(state.authentication.sessionKey, sessionPass)

    if (password !== false) {
      return password
    } else {
      throw new Error("Unable to decrypt sensitive info");
    }
  }
}

export const requestSeeds = async () => {
  const state = store.getState()

  if (
    state.authentication.activeAccount == null
  ) {
    throw new Error("You must be signed in to retrieve seeds");
  } else {
    const password = await requestPassword()
    let seeds = arrayToObject(
      CHANNELS,
      (acc, key) =>
        state.authentication.activeAccount.seeds[key]
          ? decryptkey(password, state.authentication.activeAccount.seeds[key])
          : null,
      true
    );

    return seeds;
  }
}

export const requestPrivKey = async (chainTicker, channel) => {
  const state = store.getState()

  if (
    state.authentication.activeAccount == null
  ) {
    throw new Error("You must be signed in to retrieve keys");
  } else {
    if (
      state.authentication.activeAccount.keys[chainTicker] == null ||
      state.authentication.activeAccount.keys[chainTicker][channel] == null
    ) {
      throw new Error(
        `Could not get ${chainTicker} key for channel ${channel}, either channel isn't supported or coin is inactive`
      );
    } else {
      const password = await requestPassword()
      const key = decryptkey(password, state.authentication.activeAccount.keys[chainTicker][channel]
        .encryptedPrivKey)
      
      if (key !== false) {
        return key
      } else {
        throw new Error("Unable to decrypt key");
      }
    }
  }
}

export const requestViewingKey = async (chainTicker, channel) => {
  const state = store.getState()

  if (
    state.authentication.activeAccount == null
  ) {
    throw new Error("You must be signed in to retrieve viewing keys");
  } else {
    if (
      state.authentication.activeAccount.keys[chainTicker] == null ||
      state.authentication.activeAccount.keys[chainTicker][channel] == null
    ) {
      throw new Error(
        `Could not get ${chainTicker} viewing key for channel ${channel}, either channel isn't supported or coin is inactive`
      );
    } else {
      if (
        state.authentication.activeAccount.keys[chainTicker][channel]
          .encryptedViewingKey == null
      ) {
        throw new Error(
          `${channel} is not a channel that contains a viewing key, or the viewing key isn't loaded`
        );
      }

      const password = await requestPassword()
      const key = decryptkey(password, state.authentication.activeAccount.keys[chainTicker][channel]
        .encryptedViewingKey)
      
      if (key !== false) {
        return key
      } else {
        throw new Error("Unable to decrypt viewing key");
      }
    }
  }
}