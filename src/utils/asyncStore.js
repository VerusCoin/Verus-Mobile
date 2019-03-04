// Handle all calls to Async Storage (persistent) in this file

import {
  encryptkey,
  decryptkey,
} from './seedCrypt';

import { AsyncStorage, Alert } from "react-native";
import { arrayify } from 'ethers/utils/bytes';
// react-native's version of local storage

export const INIT = "initialized";
export const PIN = "pin";

export const initialize = () => AsyncStorage.setItem(INIT, "true");
// set storage to hold key as TRUE

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

export const deleteUserFromCoins = (userID) => {
  return new Promise((resolve, reject) => {
    getActiveCoinsList()
    .then((coinList) => {
      let newList = coinList.slice()
      for (let i = 0; i < newList.length; i++) {
        let userIndex = newList[i].users.findIndex(n => n === userID);

        if (userIndex > -1) {
          newList[i].users.splice(userIndex, 1);
        }
      }

      return storeCoins(newList)
    })
    .then((res) => {
      resolve(res)
    })
    .catch((err) => {
      reject(err)
    })
  });
}

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
              deleteUserFromCoins(userID),
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

//Set storage to hold list of activated coins
export const storeCoins = (coins) => {
  let _coins = coins ? coins.slice() : []
  let _toStore = {coins: _coins}

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem('activeCoins', JSON.stringify(_toStore))
      .then(() => {
        resolve(true);
      })
      .catch(err => reject(err));
  }) 
};

export const getActiveCoinsList = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('activeCoins')
      .then(res => {
        if (!res) {
          let coinsList = {coins: []};
          resolve(coinsList.coins);
        }
        else {
          _res = JSON.parse(res);
          resolve(_res.coins);
        }
      })
      .catch(err => reject(err));
  });
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

export const clearStorage = () => AsyncStorage.clear();
//For testing purposes

export const isSignedIn = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(KEY)
      .then(res => {
        if (res !== null) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch(err => reject(err));
  });
};
