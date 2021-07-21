import AsyncStorage from '@react-native-community/async-storage';
// react-native's version of local storage

import {
  encryptkey,
  decryptkey,
} from '../seedCrypt'

import { hashAccountId } from "../crypto/hash";
import { CHANNELS_NULL_TEMPLATE, DLIGHT_PRIVATE, ELECTRUM, WYRE_SERVICE } from "../constants/intervalConstants";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import store from '../../store';
import { setAccounts } from '../../actions/actionCreators';
import { USER_DATA_STORAGE_INTERNAL_KEY } from '../../../env/index';

//Set storage to hold encrypted user data
export const storeUser = (authData, users) => {
  return new Promise(async (resolve, reject) => {
    let encryptedKeys = { ...CHANNELS_NULL_TEMPLATE };
    const { seeds } = authData;

    for (const seedType in authData.seeds) {
      if (seeds[seedType])
        encryptedKeys[seedType] = await encryptkey(
          authData.password,
          seeds[seedType]
        );
    }

    let userObj = {
      id: authData.userName,
      accountHash: hashAccountId(authData.userName),
      encryptedKeys,
      biometry: authData.biometry ? true : false,
      keyDerivationVersion:
        authData.keyDerivationVersion == null
          ? 0
          : authData.keyDerivationVersion,
    };
    let _users = users ? users.slice() : [];
    _users.push(userObj);
    let _toStore = { users: _users };

  
    AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore))
      .then(() => {
        resolve(_users);
      })
      .catch(err => reject(err));
  })
};

//Add user encrypted key for a channel
export const addEncryptedKeyToUser = async (accountHash, channel, seed, password, overwrite = false) => {
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

      await AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: newUsers}))
      return await getUsers()
    }
  } catch(e) {
    throw e
  }
};

//Set storage to hold encrypted user data
export const setUsers = (users) => {
  let _toStore = {users}

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore))
      .then(() => {
        resolve(_toStore.users);
      })
      .catch(err => reject(err));
  })
};

//Delete user by user ID and return new user array
export const deleteUser = (accountHash) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(res => {
        let _users = res ? JSON.parse(res).users : [];
        if(accountHash !== null) {
          let userIndex = _users.findIndex(n => n.accountHash === accountHash);

          if (userIndex > -1) {
            _users.splice(userIndex, 1);
            let _toStore = {users: _users}
            let promiseArr = [
              AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore)),
              _users]
            return Promise.all(promiseArr)
          } else {
            createAlert("Error", "User with hash " + accountHash + " not found");
            throw new Error("User with hash " + accountHash + " not found")
          }
        } else {
          createAlert("Error", "accountHash is null");
          throw new Error("accountHash is null")
        }
      })
      .then((res) => {
        let _users = res.pop()
        resolve(_users);
      })
      .catch(err => reject(err));
  });
};

export const resetUserPwd = (userID, newPwd, oldPwd) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async res => {
        let _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            const _oldEncryptedKeys = _users[userIndex].encryptedKeys
            const { dlight_private, electrum, wyre_service } = _oldEncryptedKeys

            const _decryptedElectrum = electrum != null ? decryptkey(oldPwd, _oldEncryptedKeys.electrum) : null
            const _decryptedDlight = dlight_private != null ? decryptkey(oldPwd, _oldEncryptedKeys.dlight_private) : null
            const _decryptedWyre = wyre_service != null ? decryptkey(oldPwd, _oldEncryptedKeys.wyre_service) : null

            if ((electrum == null || _decryptedElectrum) && (dlight_private == null || _decryptedDlight)) {
              const _newElectrumKey = electrum ? await encryptkey(newPwd, _decryptedElectrum) : null
              const _newDlightKey = dlight_private ? await encryptkey(newPwd, _decryptedDlight) : null
              const _newWyreKey = wyre_service ? await encryptkey(newPwd, _decryptedWyre) : null

              _users[userIndex].encryptedKeys = {
                [ELECTRUM]: _newElectrumKey,
                [DLIGHT_PRIVATE]: _newDlightKey,
                [WYRE_SERVICE]: _newWyreKey
              }
              
              let _toStore = {users: _users}
              let promiseArr = [AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore)), _users]
              return Promise.all(promiseArr)
            } else {
              createAlert("Authentication Error", "incorrect password")
              return "error";
            }

          } else {
            createAlert("Error", "User with ID " + userID + " not found")
            return "error"
          }
        } else {
          createAlert("Error", "UserID is null")
          return "error"
        }
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
  });
};

export const setUserBiometry = (userID, biometry) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async (res) => {
        let _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            _users[userIndex].biometry = biometry
            await AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: _users}))
            resolve(_users)
          } else {
            throw new Error("User with ID " + userID + " not found")
          }
        } else {
          throw new Error("UserID is null")
        }
      })
      .catch(err => {
        reject(err)
        console.warn(err)
      });
  });
};

export const setUserKeyDerivationVersion = (userID, keyDerivationVersion) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async (res) => {
        let _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            _users[userIndex].keyDerivationVersion = keyDerivationVersion
            await AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: _users}))
            resolve(_users)
          } else {
            throw new Error("User with ID " + userID + " not found")
          }
        } else {
          throw new Error("UserID is null")
        }
      })
      .catch(err => {
        reject(err)
        console.warn(err)
      });
  });
};

//TODO: Stop using wifKey to encrypt payment methods before using them in production
export const putUserPaymentMethods = async (user, paymentMethods) => {
  //const encryptedPaymentMethods = encryptkey(user.wifKey, JSON.stringify(paymentMethods))
  const encryptedPaymentMethods = "none"
  return await putUser(user.id, {
    paymentMethods: encryptedPaymentMethods,
  })
}

export const putUser = (userID, userParams) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
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
            const promiseArr = [AsyncStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(_toStore)), _users]
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
  });
};

//Get array of encrypted user data
export const getUsers = () => {
  let users = {}
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(res => {
        users = res ? JSON.parse(res) : {users: []};
        resolve(users.users)
      })
      .catch(err => reject(err));
  })
};

// Check user password
export const checkPinForUser = (pin, userName, alertOnFail = true) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)
      .then(async res => {
        let users = res ? JSON.parse(res) : {users: []};
        if(pin !== null && users.users) {
          let user = users.users.find(n => n.id === userName);

          if (user) {
            const { electrum, dlight_private } = user.encryptedKeys
            const _decryptedSeeds = {
              [ELECTRUM]: electrum != null ? decryptkey(pin, electrum) : null,
              [DLIGHT_PRIVATE]: dlight_private != null ? decryptkey(pin, dlight_private) : null,
            }

            if (
              (electrum == null || _decryptedSeeds.electrum) &&
              (dlight_private == null ||
                _decryptedSeeds.dlight_private)
            ) {
              for (const channel in _decryptedSeeds) {
                if (_decryptedSeeds[channel]) {
                  try {
                    store.dispatch(setAccounts(await addEncryptedKeyToUser(
                      hashAccountId(userName),
                      channel,
                      _decryptedSeeds[channel],
                      pin,
                      true
                    )))
                  } catch(e) {
                    createAlert(
                      "Authentication Error",
                      "Internal authentication error."
                    );
                  }
                }
              }

              resolve(_decryptedSeeds);
            } else {
              if (alertOnFail)
                createAlert(
                  "Authentication Error",
                  "Incorrect password"
                );
              throw new Error("Incorrect password");
            }
          }
          else {
            if (alertOnFail) createAlert("Authentication Error", "Please select an existing user")
            throw new Error("Please select an existing user");
          }
        }
        else {
          if (alertOnFail) createAlert("Authentication Error", "Please enter a password")
          throw new Error("Please enter a password");
        }
      })
      .catch(err => {
        reject(err)
      });
  });
};

export const onSignOut = () => AsyncStorage.removeItem(KEY);
//if user signs out, remove TRUE key
