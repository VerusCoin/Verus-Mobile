// Handle all calls to Async Storage (persistent) in this file

import {
  encryptkey,
  decryptkey,
} from './seedCrypt';

import { AsyncStorage, Alert } from "react-native";
// react-native's version of local storage

export const INIT = "initialized";
export const PIN = "pin";

export const initialize = () => AsyncStorage.setItem(INIT, "true");
// set storage to hold key as TRUE

/*
//Set storage to hold encrypted user data
export const storeUser = (authData) => {
  let users = {}
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('userData')
      .then(res => {
        users = res ? JSON.parse(res) : {users: []};
        let encryptedKey = encryptkey(authData.pin, authData.wifKey)
        let userObj = {id: authData.userName, encryptedKey: encryptedKey}

        users.users.push(userObj);
        AsyncStorage.setItem('userData', JSON.stringify(users));
        //Alert.alert("Storing user", users.users[0].id);
        resolve(users.users)
      })
      .catch(err => reject(err));
  }) 
};
*/


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

//Set storage to hold encrypted user data
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
 /*
//Set storage to hold list of activated coins
export const storeCoins = (coinObj) => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem('activeCoins')
        .then(res => {
          let _activeCoins = res ? JSON.parse(res) : {coins: []};
          _activeCoins.coins.push(coinObj);
          AsyncStorage.setItem('activeCoins', JSON.stringify(_activeCoins));
          resolve(true);
        })
        .catch(err => reject(err));
    }) 
};
*/

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
        if(pin !== null) {
          let user = users.users.find(n => n.id === userName);
          if (user) {
            const _decryptedKey = decryptkey(pin, user.encryptedKey);
            if (_decryptedKey) {
              resolve(_decryptedKey);
            }
            else {
              Alert.alert("Authentication Error", "incorrect password");
              resolve(false);
            }
          }
          else {
            Alert.alert("Authentication Error", "please select an existing user");
            resolve(false);
          }
        }
        else {
          Alert.alert("Authentication Error", "please enter a password");
          resolve(false);
        }
        
      })
      .catch(err => reject(err));
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
