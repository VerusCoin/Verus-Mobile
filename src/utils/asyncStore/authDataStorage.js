import {
  encryptkey,
  decryptkey,
} from '../seedCrypt'

import { hashAccountId } from "../crypto/hash";
import {
  CHANNELS_NULL_TEMPLATE,
  DLIGHT_PRIVATE,
  ELECTRUM,
  WYRE_SERVICE,
} from "../constants/intervalConstants";
import store from '../../store';
import {
  setAccounts,
  setShowHideSeedCorruptionSetting,
  signOut,
  updateSessionKey,
} from '../../actions/actionCreators';
import {
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY,
  USER_DATA_STORAGE_INTERNAL_KEY,
} from '../../../env/index';
import { WYRE_SERVICE_ID } from '../constants/services';
import {
  getSessionCredential,
  removeSessionCredential,
} from '../keychain/keychain';
import { initSession } from '../auth/authBox';
import {
  PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
  SecureStorage,
} from '../keychain/secureStore';
import { Alert } from 'react-native';
import { SUSPICIOUS_UNICODE_CHARACTER_TEST } from '../constants/regex';
import { INCORRECT_PASSWORD_DELAY_ERROR_MS } from '../constants/errors';
import { setPersonalData } from '../../actions/actions/personal/creators/personal';
import { setServiceStored } from '../../actions/actions/services/creators/services';
import {
  queuePasswordProtectedStorageMigration,
  queueUserStorageWrite,
} from './passwordProtectedStorageQueue';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';

//Set storage to hold encrypted user data
export const storeUser = (authData, users) =>
  queueUserStorageWrite(async () => {
    let encryptedKeys = {...CHANNELS_NULL_TEMPLATE};
    const {seeds} = authData;

    for (const seedType in authData.seeds) {
      if (seeds[seedType]) {
        encryptedKeys[seedType] = await encryptkey(
          authData.password,
          seeds[seedType],
        );
      }
    }

    let userObj = {
      id: authData.userName,
      accountHash: hashAccountId(authData.userName),
      encryptedKeys,
      biometry: authData.biometry ? true : false,
      hideSeedWarnings: !!(authData.hideSeedWarnings),
      keyDerivationVersion:
        authData.keyDerivationVersion == null
          ? 0
          : authData.keyDerivationVersion,
      disabledServices:
        authData.disabledServices == null
          ? encryptedKeys[WYRE_SERVICE]
            ? {}
            : {[WYRE_SERVICE_ID]: true}
          : authData.disabledServices,
      testnetOverrides: authData.testnetOverrides
    };

    // Use the durable root once the queue is held. The caller's account list
    // can have been captured before a password migration began.
    const storedUsersRecord = parseStoredObject(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
      "user",
    );
    let _users = Array.isArray(storedUsersRecord.users)
      ? storedUsersRecord.users.slice()
      : users
        ? users.slice()
        : [];
    _users.push(userObj);
    let _toStore = {...storedUsersRecord, users: _users};

    await SecureStorage.setItem(
      USER_DATA_STORAGE_INTERNAL_KEY,
      JSON.stringify(_toStore),
    );
    return _users;
  });



//Add user encrypted key for a channel
const addEncryptedKeyToUserUnlocked = async (accountHash, channel, seed, password, overwrite = false) => {
  try {
    const users = await getUsers()

    const userObjIndex = users.findIndex(user => user.accountHash === accountHash)
    if (userObjIndex === -1) throw new Error("User with hash " + accountHash + " not found.")
    const userObj = users[userObjIndex]

    if (userObj.encryptedKeys[channel] != null && !overwrite) {
      throw new Error(`User with hash ${accountHash} already has as ${channel} seed, cannot overwrite.`)
    } else {
      let newUserObj = {...userObj}
      newUserObj.encryptedKeys[channel] = await encryptkey(password, seed)
      
      let newUsers = [...users]
      newUsers[userObjIndex] = newUserObj

      await SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: newUsers}))
      return await getUsers()
    }
  } catch(e) {
    throw e
  }
};

export const addEncryptedKeyToUser = (accountHash, channel, seed, password, overwrite = false) =>
  queueUserStorageWrite(() =>
    addEncryptedKeyToUserUnlocked(accountHash, channel, seed, password, overwrite),
  );

/**
 * Atomically reads, transforms, and writes the complete user root while the
 * password-migration exclusion lock is held.
 */
export const updateUsers = updater => queueUserStorageWrite(async () => {
  if (typeof updater !== "function") {
    throw new Error("User storage updater must be a function");
  }

  const usersRecord = parseStoredObject(
    await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    "user",
  );
  const users = usersRecord.users == null ? [] : usersRecord.users;
  if (!Array.isArray(users)) throw new Error("Invalid user storage");

  const nextUsers = await updater(users);
  if (!Array.isArray(nextUsers)) {
    throw new Error("User storage updater must return an array");
  }

  if (nextUsers !== users) {
    await SecureStorage.setItem(
      USER_DATA_STORAGE_INTERNAL_KEY,
      JSON.stringify({...usersRecord, users: nextUsers}),
    );
  }
  return nextUsers;
});

// Set storage to hold encrypted user data. New read-modify-write paths should
// use updateUsers so the read is covered by the same exclusion lock.
export const setUsers = users => updateUsers(() => users);

const PASSWORD_MIGRATION_VERSION = 1;
const PASSWORD_MIGRATION_KEYS = [
  USER_DATA_STORAGE_INTERNAL_KEY,
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY,
];

const validatePasswordMigrationJournal = journal => {
  if (
    journal == null ||
    journal.version !== PASSWORD_MIGRATION_VERSION ||
    !["prepared", "committed"].includes(journal.phase)
  ) {
    throw new Error("Invalid password migration recovery journal");
  }

  // New committed journals are deliberately reduced to a tombstone so a
  // failed marker cleanup cannot retain deleted or superseded profile roots.
  // Continue accepting full committed journals written by older versions.
  if (
    journal.phase === "committed" &&
    journal.before == null &&
    journal.after == null
  ) {
    return;
  }

  if (journal.before == null || journal.after == null) {
    throw new Error("Incomplete password migration recovery journal");
  }

  for (const key of PASSWORD_MIGRATION_KEYS) {
    if (!(key in journal.before) || !(key in journal.after)) {
      throw new Error("Incomplete password migration recovery journal");
    }
  }
};

const createCommittedJournalTombstone = journal => ({
  version: PASSWORD_MIGRATION_VERSION,
  accountHash: journal.accountHash,
  phase: "committed",
});

const applyPasswordMigrationSnapshot = async snapshot => {
  for (const key of PASSWORD_MIGRATION_KEYS) {
    if (snapshot[key] == null) {
      await SecureStorage.removeItem(key);
    } else {
      await SecureStorage.setItem(key, snapshot[key]);
    }
  }
};

/**
 * Completes recovery from an interrupted password reset. A prepared migration
 * rolls back. A committed marker proves every root was already durable, so its
 * recovery only removes the marker and never replays a potentially stale
 * `after` snapshot over later data.
 */
const recoverPasswordMigrationUnlocked = async () => {
  const storedJournal = await SecureStorage.getItem(
    PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
  );

  if (storedJournal == null) return false;

  let journal;
  try {
    journal = JSON.parse(storedJournal);
  } catch (_) {
    throw new Error("Unable to parse password migration recovery journal");
  }

  validatePasswordMigrationJournal(journal);
  if (journal.phase === "prepared") {
    await applyPasswordMigrationSnapshot(journal.before);
  }
  await SecureStorage.removeItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY);
  return true;
};

export const recoverPasswordMigration = () =>
  queuePasswordProtectedStorageMigration(recoverPasswordMigrationUnlocked);

const parseStoredObject = (storedValue, recordName) => {
  if (storedValue == null) return {};

  const parsed = JSON.parse(storedValue);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid ${recordName} storage`);
  }

  return parsed;
};

// Remove the account and its encrypted data as one recoverable three-root
// transaction. A prepared journal rolls every root back after a failed write
// or interrupted process; a committed journal only needs cleanup.
export const deleteUser = accountHash =>
  queuePasswordProtectedStorageMigration(async () => {
    await recoverPasswordMigrationUnlocked();

    const storedValues = await Promise.all(
      PASSWORD_MIGRATION_KEYS.map(key => SecureStorage.getItem(key)),
    );
    const before = PASSWORD_MIGRATION_KEYS.reduce((snapshot, key, index) => {
      snapshot[key] = storedValues[index];
      return snapshot;
    }, {});
    const usersRecord = parseStoredObject(
      before[USER_DATA_STORAGE_INTERNAL_KEY],
      "user",
    );
    const users = Array.isArray(usersRecord.users)
      ? usersRecord.users.slice()
      : [];
    const userIndex = users.findIndex(user => user.accountHash === accountHash);

    if (accountHash == null || userIndex === -1) {
      Alert.alert("Error", `User with hash ${accountHash} not found`);
      throw new Error(`User with hash ${accountHash} not found`);
    }

    users.splice(userIndex, 1);
    const personalRecord = parseStoredObject(
      before[PERSONAL_DATA_STORAGE_INTERNAL_KEY],
      "personal data",
    );
    const serviceRecord = parseStoredObject(
      before[SERVICE_STORAGE_INTERNAL_KEY],
      "service data",
    );
    delete personalRecord[accountHash];
    delete serviceRecord[accountHash];

    const after = {
      [USER_DATA_STORAGE_INTERNAL_KEY]: JSON.stringify({...usersRecord, users}),
      [PERSONAL_DATA_STORAGE_INTERNAL_KEY]: JSON.stringify(personalRecord),
      [SERVICE_STORAGE_INTERNAL_KEY]: JSON.stringify(serviceRecord),
    };
    const journal = {
      version: PASSWORD_MIGRATION_VERSION,
      accountHash,
      phase: "prepared",
      before,
      after,
    };

    try {
      await SecureStorage.setItem(
        PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
        JSON.stringify(journal),
      );
      await applyPasswordMigrationSnapshot(after);
      await SecureStorage.setItem(
        PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
        JSON.stringify(createCommittedJournalTombstone(journal)),
      );
    } catch (error) {
      try {
        await applyPasswordMigrationSnapshot(before);
        await SecureStorage.removeItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY);
      } catch (rollbackError) {
        // Retain the prepared journal for startup recovery.
        console.warn(rollbackError);
      }
      throw error;
    }

    try {
      await SecureStorage.removeItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY);
    } catch (cleanupError) {
      // The committed roots are final; startup recovery only removes the marker.
      console.warn(cleanupError);
    }
    return users;
  });

const reencryptRecord = async (record, oldPwd, newPwd, recordName) => {
  const nextRecord = {...record};

  for (const key of Object.keys(nextRecord)) {
    const encryptedValue = nextRecord[key];
    if (encryptedValue == null) continue;
    if (typeof encryptedValue !== "string") {
      throw new Error(`Invalid encrypted ${recordName} value for ${key}`);
    }

    const decryptedValue = decryptkey(oldPwd, encryptedValue);
    if (decryptedValue === false) {
      const passwordError = new Error(
        `Unable to decrypt ${recordName} value for ${key}`,
      );
      passwordError.code = "INCORRECT_PASSWORD";
      throw passwordError;
    }

    nextRecord[key] = await encryptkey(newPwd, decryptedValue);
  }

  return nextRecord;
};

let passwordMigrationQueue = Promise.resolve();

const resetUserPwdTransaction = async (
  accountHash,
  newPwd,
  oldPwd,
  sessionScope,
) => {
  const assertResetSessionCurrent = expectedScope => {
    if (!sessionScopeIsCurrent(store.getState(), expectedScope)) {
      const sessionError = new Error(
        'Account changed while the password reset was in progress.',
      );
      sessionError.code = 'SESSION_CHANGED';
      throw sessionError;
    }
  };

  assertResetSessionCurrent(sessionScope);
  // resetUserPwd already owns all three root queues here.
  await recoverPasswordMigrationUnlocked();
  assertResetSessionCurrent(sessionScope);

  const storedValues = await Promise.all(
    PASSWORD_MIGRATION_KEYS.map(key => SecureStorage.getItem(key)),
  );
  const before = PASSWORD_MIGRATION_KEYS.reduce((snapshot, key, index) => {
    snapshot[key] = storedValues[index];
    return snapshot;
  }, {});

  const usersRecord = parseStoredObject(
    before[USER_DATA_STORAGE_INTERNAL_KEY],
    "user",
  );
  const users = Array.isArray(usersRecord.users)
    ? usersRecord.users.map(user => ({...user}))
    : [];
  const userIndex = users.findIndex(user => user.accountHash === accountHash);

  if (accountHash == null || userIndex === -1) {
    Alert.alert("Error", `User with ID ${accountHash} not found`);
    return false;
  }

  const user = users[userIndex];
  user.biometry = false;
  const personalRecord = parseStoredObject(
    before[PERSONAL_DATA_STORAGE_INTERNAL_KEY],
    "personal data",
  );
  const serviceRecord = parseStoredObject(
    before[SERVICE_STORAGE_INTERNAL_KEY],
    "service data",
  );
  const oldSessionKey = store.getState().authentication.sessionKey;
  let oldSessionCredential;

  try {
    oldSessionCredential = await getSessionCredential();
  } catch (sessionError) {
    console.warn(sessionError);
    return false;
  }

  if (oldSessionKey != null && typeof oldSessionCredential === "string") {
    const sessionPassword = decryptkey(oldSessionKey, oldSessionCredential);
    if (sessionPassword === false || sessionPassword !== oldPwd) {
      Alert.alert("Authentication Error", "Incorrect password");
      return false;
    }
  }

  try {
    user.encryptedKeys = await reencryptRecord(
      user.encryptedKeys || {},
      oldPwd,
      newPwd,
      "account key",
    );

    if (personalRecord[accountHash] != null) {
      personalRecord[accountHash] = await reencryptRecord(
        personalRecord[accountHash],
        oldPwd,
        newPwd,
        "personal data",
      );
    }

    if (serviceRecord[accountHash] != null) {
      serviceRecord[accountHash] = await reencryptRecord(
        serviceRecord[accountHash],
        oldPwd,
        newPwd,
        "service data",
      );
    }
  } catch (encryptionError) {
    if (encryptionError.code === "INCORRECT_PASSWORD") {
      Alert.alert("Authentication Error", "Incorrect password");
      return false;
    }

    throw encryptionError;
  }

  const after = {
    [USER_DATA_STORAGE_INTERNAL_KEY]: JSON.stringify({...usersRecord, users}),
    [PERSONAL_DATA_STORAGE_INTERNAL_KEY]: JSON.stringify(personalRecord),
    [SERVICE_STORAGE_INTERNAL_KEY]: JSON.stringify(serviceRecord),
  };

  const journal = {
    version: PASSWORD_MIGRATION_VERSION,
    accountHash,
    phase: "prepared",
    before,
    after,
  };
  let committedDurable = false;
  let sessionCredentialMutationStarted = false;

  try {
    assertResetSessionCurrent(sessionScope);
    await SecureStorage.setItem(
      PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
      JSON.stringify(journal),
    );
    await applyPasswordMigrationSnapshot(after);

    // The committed marker is the durable boundary: every protected root is
    // already in its new version, while no new session or Redux data has been
    // exposed yet. A marker failure therefore remains safely rollbackable.
    assertResetSessionCurrent(sessionScope);
    await SecureStorage.setItem(
      PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
      JSON.stringify(createCommittedJournalTombstone(journal)),
    );
    committedDurable = true;

    // initSession writes the process-wide Keychain credential. Mark the
    // mutation attempt before awaiting so an account switch during that await
    // is handled by fail-closed global session invalidation.
    assertResetSessionCurrent(sessionScope);
    sessionCredentialMutationStarted = true;
    const sessionKey = await initSession(newPwd);
    assertResetSessionCurrent(sessionScope);
    store.dispatch(
      scopeSessionAction(updateSessionKey(sessionKey), sessionScope),
    );
    const postResetSessionScope = {
      ...sessionScope,
      sessionEpoch: sessionScope.sessionEpoch + 1,
    };
    assertResetSessionCurrent(postResetSessionScope);

    const nextPersonalData = personalRecord[accountHash] || {};
    const nextServiceData = serviceRecord[accountHash] || {};
    store.dispatch(scopeSessionAction(
      setPersonalData(nextPersonalData),
      postResetSessionScope,
    ));
    assertResetSessionCurrent(postResetSessionScope);
    if (store.getState().personal !== nextPersonalData) {
      throw new Error('Failed to publish migrated personal data');
    }
    store.dispatch(scopeSessionAction(
      setServiceStored(nextServiceData),
      postResetSessionScope,
    ));
    assertResetSessionCurrent(postResetSessionScope);
    if (store.getState().services.stored !== nextServiceData) {
      throw new Error('Failed to publish migrated service data');
    }

    try {
      await SecureStorage.removeItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY);
    } catch (cleanupError) {
      // Roots and visible state are committed. Retain the marker so normal
      // protected writes fail closed until explicit recovery finishes cleanup.
      console.warn(cleanupError);
    }

    return users;
  } catch (err) {
    console.warn(err);

    if (committedDurable) {
      if (sessionCredentialMutationStarted) {
        // The Keychain credential is process-wide. Never restore account A's
        // old credential after a concurrent switch to account B; invalidate
        // the current session globally and require fresh authentication.
        try {
          await removeSessionCredential();
        } catch (credentialCleanupError) {
          console.warn(credentialCleanupError);
        }
        store.dispatch(signOut());
      }

      // A committed transaction cannot be rolled back or replayed. Keep its
      // marker so startup recovery can finish cleanup without touching roots.
      return false;
    }

    try {
      await applyPasswordMigrationSnapshot(before);
      await SecureStorage.removeItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY);
    } catch (rollbackError) {
      // Keep the prepared journal so the next startup can finish rolling back.
      console.warn(rollbackError);
    }

    return false;
  }
};

export const resetUserPwd = (
  accountHash,
  newPwd,
  oldPwd,
  sessionScope = captureSessionScope(store.getState(), accountHash),
) => {
  const migration = passwordMigrationQueue.then(
    () => queuePasswordProtectedStorageMigration(
      () => resetUserPwdTransaction(
        accountHash,
        newPwd,
        oldPwd,
        sessionScope,
      ),
    ),
    () => queuePasswordProtectedStorageMigration(
      () => resetUserPwdTransaction(
        accountHash,
        newPwd,
        oldPwd,
        sessionScope,
      ),
    ),
  );

  passwordMigrationQueue = migration.catch(() => {});
  return migration;
};

const setUserSetting = (accountHash, settingKey, setting) =>
  queueUserStorageWrite(() => new Promise((resolve, reject) => {
    SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async (res) => {
        let _users = res ? JSON.parse(res).users : [];
        if(accountHash !== null) {
          let userIndex = _users.findIndex(n => n.accountHash === accountHash);

          if (userIndex > -1) {
            _users[userIndex][settingKey] = setting
            await SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: _users}))
            resolve(_users)
          } else {
            throw new Error("User with hash " + accountHash + " not found")
          }
        } else {
          throw new Error("UserID is null")
        }
      })
      .catch(err => {
        reject(err)
        console.warn(err)
      });
  }));

export const setUserBiometry = (accountHash, biometry) => {
  return setUserSetting(accountHash, "biometry", biometry)
};

export const setUserHideSeedWarnings = (accountHash, hideSeedWarnings) => {
  return setUserSetting(accountHash, "hideSeedWarnings", hideSeedWarnings)
};

export const setUserKeyDerivationVersion = (accountHash, keyDerivationVersion) => {
  return setUserSetting(accountHash, "keyDerivationVersion", keyDerivationVersion)
};

export const setUserDisabledServices = (accountHash, disabledServices) => {
  return setUserSetting(accountHash, "disabledServices", disabledServices)
};

export const setUserTestnetOverrides = (accountHash, testnetOverrides) => {
  return setUserSetting(accountHash, "testnetOverrides", testnetOverrides)
}

//TODO: Stop using wifKey to encrypt payment methods before using them in production
export const putUserPaymentMethods = async (user, paymentMethods) => {
  //const encryptedPaymentMethods = encryptkey(user.wifKey, JSON.stringify(paymentMethods))
  const encryptedPaymentMethods = "none"
  return await putUser(user.id, {
    paymentMethods: encryptedPaymentMethods,
  })
}

export const putUser = (userID, userParams) =>
  queueUserStorageWrite(() => new Promise((resolve, reject) => {
    SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(res => {
        const _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            _users[userIndex] = {
              ..._users[userIndex],
              ...userParams,
            }
            const _toStore = { users: _users }
            const promiseArr = [SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore)), _users]
            return Promise.all(promiseArr)
          }
        }
        return 'error'
      })
      .then((res) => {
        if (res === "error") {
          resolve(false);
        } else if (Array.isArray(res)) {
          let _users = res.pop()
          resolve(_users);
        }
      })
      .catch(err => {
        reject(err)
        console.warn(err)
      });
  }));

//Get array of encrypted user data
export const getUsers = () => {
  let users = {}
  return new Promise((resolve, reject) => {
    SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(res => {
        users = res ? JSON.parse(res) : {users: []};
        resolve(users.users)
      })
      .catch(err => reject(err));
  })
};

// Check user password
export const checkPinForUser = (pin, userName, alertOnFail = true, alertOnCorruptedSeed = false) =>
  queueUserStorageWrite(() => new Promise((resolve, reject) => {
    SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async res => {
        let users = res ? JSON.parse(res) : {users: []};
        if(pin !== null && users.users) {
          let user = users.users.find(n => n.id === userName);

          if (user) {
            const { electrum, dlight_private, wyre_service } = user.encryptedKeys
            const _decryptedSeeds = {
              [ELECTRUM]: electrum != null ? decryptkey(pin, electrum) : null,
              [DLIGHT_PRIVATE]: dlight_private != null ? decryptkey(pin, dlight_private) : null,
              [WYRE_SERVICE]: wyre_service != null ? decryptkey(pin, wyre_service) : null,
            }

            if (
              (electrum == null || _decryptedSeeds.electrum) &&
              (dlight_private == null || _decryptedSeeds.dlight_private) &&
              (wyre_service == null || _decryptedSeeds.wyre_service)
            ) {
              let seedPotentiallyCorrupted = false;

              for (const channel in _decryptedSeeds) {
                if (_decryptedSeeds[channel]) {
                  try {
                    if (alertOnCorruptedSeed) {
                      seedPotentiallyCorrupted = (SUSPICIOUS_UNICODE_CHARACTER_TEST).test(_decryptedSeeds[channel])
                    }

                    store.dispatch(
                      setAccounts(
                        await addEncryptedKeyToUserUnlocked(
                          hashAccountId(userName),
                          channel,
                          _decryptedSeeds[channel],
                          pin,
                          true
                        )
                      )
                    );
                  } catch (e) {
                    Alert.alert("Authentication Error", "Internal authentication error.");
                  }
                }
              }

              if (seedPotentiallyCorrupted) {
                if (!user.hideSeedWarnings) {
                  Alert.alert(
                    "Possible Seed Corruption Detected",
                    "Non-standard characters were detected in your profile seed.\n\nIf your seed is a standard word-based phrase, or a WIF key, this could indicate that your seed data was corrupted, and may not match your seed backup.\n\nCheck your seed by going into Settings > Profile > Recover Seed. If it does not match your backup, create a new profile from your backup and send any funds on this profile to that new profile.\n\nYou can disable this warning in Profile > Settings."
                  );
                }

                store.dispatch(setShowHideSeedCorruptionSetting(true));
              }

              resolve(_decryptedSeeds);
            } else {
              setTimeout(() => {
                if (alertOnFail) Alert.alert("Authentication Error", "Incorrect password");

                reject(new Error("Incorrect password"));
              }, INCORRECT_PASSWORD_DELAY_ERROR_MS);
            }
          }
          else {
            if (alertOnFail) Alert.alert("Authentication Error", "Please select an existing user")
            throw new Error("Please select an existing user");
          }
        }
        else {
          if (alertOnFail) Alert.alert("Authentication Error", "Please enter a password")
          throw new Error("Please enter a password");
        }
      })
      .catch(err => {
        reject(err)
      });
  }));

export const onSignOut = () => SecureStorage.removeItem(KEY);
//if user signs out, remove TRUE key
