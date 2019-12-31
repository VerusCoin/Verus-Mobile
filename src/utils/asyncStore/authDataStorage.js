import { Alert } from "react-native";
import AsyncStorage from '@react-native-community/async-storage';
// react-native's version of local storage

import {
  encryptkey,
  decryptkey,
} from '../seedCrypt'

import {
  deleteUserFromCoin
} from './asyncStore'

//Set storage to hold encrypted user data
export const storeUser = (authData, users) => {
  let encryptedKey = encryptkey(authData.pin, authData.wifKey)
  let userObj = {id: authData.userName, encryptedKey: encryptedKey}
  let _users = users ? users.slice() : [];
  _users.push(userObj)
  let _toStore = {users: _users}

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem('userData', JSON.stringify(_toStore))
      .then(() => {
        resolve(_users);
      })
      .catch(err => reject(err));
  })
};

//Delete user by user ID and return new user array
export const deleteUser = (userID) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('userData')
      .then(res => {
        let _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            _users.splice(userIndex, 1);
            let _toStore = {users: _users}
            let promiseArr = [
              AsyncStorage.setItem('userData', JSON.stringify(_toStore)),
              deleteUserFromCoin(userID, null),
              _users]
            return Promise.all(promiseArr)
          } else {
            Alert.alert("Error", "User with ID " + userID + " not found");
            return "error"
          }
        } else {
          Alert.alert("Error", "UserID is null");
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
      .catch(err => reject(err));
  });
};

export const resetUserPwd = (userID, newPwd, oldPwd) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('userData')
      .then(res => {
        let _users = res ? JSON.parse(res).users : [];
        if(userID !== null) {
          let userIndex = _users.findIndex(n => n.id === userID);

          if (userIndex > -1) {
            const _oldEncryptedKey = _users[userIndex].encryptedKey
            const _decryptedKey = decryptkey(oldPwd, _oldEncryptedKey)

            if (_decryptedKey) {
              const _newEncryptedKey = encryptkey(newPwd, _decryptedKey)
              _users[userIndex].encryptedKey = _newEncryptedKey
              let _toStore = {users: _users}
              let promiseArr = [AsyncStorage.setItem('userData', JSON.stringify(_toStore)), _users]
              return Promise.all(promiseArr)
            } else {
              Alert.alert("Authentication Error", "incorrect password")
              return "error";
            }

          } else {
            Alert.alert("Error", "User with ID " + userID + " not found")
            return "error"
          }
        } else {
          Alert.alert("Error", "UserID is null")
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

export const putUserPaymentMethods = async (user, paymentMethods) => {
  const encryptedPaymentMethods = encryptkey(user.wifKey, JSON.stringify(paymentMethods))
  return await putUser(user.id, {
    paymentMethods: encryptedPaymentMethods,
  })
}

export const putUser = (userID, userParams) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('userData')
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
            const promiseArr = [AsyncStorage.setItem('userData', JSON.stringify(_toStore)), _users]
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
    AsyncStorage.getItem('userData')
      .then(res => {
        users = res ? JSON.parse(res) : {users: []};
        resolve(users.users)
      })
      .catch(err => reject(err));
  })
};

//Set storage to hold encrypted user data
export const checkPinForUser = (pin, userName) => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('userData')
      .then(res => {
        let users = res ? JSON.parse(res) : {users: []};
        if(pin !== null && users.users) {
          let user = users.users.find(n => n.id === userName);
          if (user) {
            const _decryptedKey = decryptkey(pin, user.encryptedKey);
            if (_decryptedKey) {
              resolve(_decryptedKey);
            }
            else {
              Alert.alert("Authentication Error", "Incorrect password");
              resolve(false);
            }
          }
          else {
            Alert.alert("Authentication Error", "Please select an existing user");
            resolve(false);
          }
        }
        else {
          Alert.alert("Authentication Error", "Please enter a password");
          resolve(false);
        }

      })
      .catch(err => {
        console.warn(err)
        reject(err)
      });
  });
};

export const onSignOut = () => AsyncStorage.removeItem(KEY);
//if user signs out, remove TRUE key
