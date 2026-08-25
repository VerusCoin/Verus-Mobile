// This is where you can retrieve private keys and seeds,
// provided you pass the required authentication checks
// This only works if a user is logged in

import store from "../../store";
import { CHANNELS } from "../constants/intervalConstants";
import { randomBytes } from "../crypto/randomBytes";
import { getSessionCredential, setSessionCredential } from "../keychain/keychain";
import { arrayToObject } from "../objectManip";
import { decryptkey, encryptkey } from "../seedCrypt";

const getRequestSessionScope = requestContext =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null);

const sessionScopeIsCurrent = (state, sessionScope) => {
  if (sessionScope == null) return true;

  const activeAccountHash =
    state.authentication.activeAccount == null
      ? null
      : state.authentication.activeAccount.accountHash;

  return (
    sessionScope.sessionScoped === true &&
    sessionScope.accountHash === activeAccountHash &&
    sessionScope.sessionEpoch === (state.authentication.sessionEpoch || 0)
  );
};

const assertRequestSessionCurrent = (sessionScope, message) => {
  if (sessionScopeIsCurrent(store.getState(), sessionScope)) return;

  const error = new Error(message);
  error.code = 'SESSION_CHANGED';
  throw error;
};

const requestPasswordForState = async (
  state,
  sessionScope = null,
  sessionError = 'Account changed while the password was being requested.',
) => {
  if (
    state.authentication.activeAccount == null ||
    state.authentication.sessionKey == null
  ) {
    throw new Error("You must be signed in to retrieve sensitive info");
  }

  const sessionPass = await getSessionCredential();
  assertRequestSessionCurrent(sessionScope, sessionError);
  const password = decryptkey(state.authentication.sessionKey, sessionPass);

  if (password !== false) return password;

  throw new Error("Unable to decrypt sensitive info");
};

// Saves the session password to the keychain and returns the 
// session key
export const initSession = async (password) => {
  const sessionKey = (await randomBytes(32)).toString('hex')
  const sessionPass = await encryptkey(sessionKey, password)
  await setSessionCredential(sessionPass)

  return sessionKey
}

export const initInstance = async () => {
  return (await randomBytes(32)).toString('hex')
}

export const requestPassword = async (requestContext = null) => {
  return requestPasswordForState(
    store.getState(),
    getRequestSessionScope(requestContext),
  );
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
      (acc, key) => {
        if (state.authentication.activeAccount.seeds[key]) {
          const seed = decryptkey(password, state.authentication.activeAccount.seeds[key]);

          if (!seed) {
            throw new Error("Unable to decrypt seed");
          } else return seed;
        } else return null;
      },
      true
    );

    return seeds;
  }
}

export const requestPrivKey = async (
  chainTicker,
  channel,
  requestContext = null,
) => {
  const sessionScope = getRequestSessionScope(requestContext);
  const sessionError =
    "Account changed while the private key was being requested.";

  assertRequestSessionCurrent(sessionScope, sessionError);
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
      // Bind both encrypted inputs to the account snapshot that was validated
      // above. requestPasswordForState must not re-read a newly active account
      // while its Keychain request is pending.
      const encryptedPrivKey =
        state.authentication.activeAccount.keys[chainTicker][channel]
          .encryptedPrivKey;
      const password = await requestPasswordForState(
        state,
        sessionScope,
        sessionError,
      )

      assertRequestSessionCurrent(sessionScope, sessionError);
      const key = decryptkey(password, encryptedPrivKey)
      
      if (key !== false) {
        assertRequestSessionCurrent(sessionScope, sessionError);
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

export const requestPersonalData = async (dataType, _password) => {
  const state = store.getState()

  if (
    state.authentication.activeAccount == null
  ) {
    throw new Error("You must be signed in to retrieve personal data");
  } else if (state.personal[dataType] == null) {
    return {}
  } else {
    const password = _password ? _password : await requestPassword();
    
    const data = decryptkey(password, state.personal[dataType]);
    
    if (data !== false) {
      try {
        return JSON.parse(data)
      } catch(e) {
        throw new Error("Unable to parse personal data")
      }
    } else {
      throw new Error("Unable to decrypt personal data");
    }
  }
}

export const requestServiceStoredData = async (service, _password) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to retrieve service stored data for " + service
    );
  } else if (state.services.stored[service] == null) {
    return {};
  } else {
    const password = _password ? _password : await requestPassword();
    const data = decryptkey(password, state.services.stored[service]);

    if (data !== false) {
      try {
        return JSON.parse(data);
      } catch (e) {
        throw new Error("Unable to parse service stored data for " + service);
      }
    } else {
      throw new Error("Unable to decrypt service stored data for " + service);
    }
  }
};
