import {
  setAccounts,
  setFingerAuth,
  signIntoAccount,
  updateAccountKeys
 } from '../actionCreators';
import {
  storeUser,
  getUsers,
  getActiveCoinsList,
  checkPinForUser,
  resetUserPwd,
  deleteUser
} from '../../utils/asyncStore/asyncStore';
import {
  makeKeyPair
} from '../../utils/keys'
import {
  decryptkey,
  decryptGeneral,
} from '../../utils/seedCrypt'

//TODO: Fingerprint authentication

export const addUser = (userName, wifKey, pin, users) => {
  let authData = {wifKey: wifKey, pin: pin, userName: userName}
  return new Promise((resolve, reject) => {
    storeUser(authData, users)
      .then(res => {
        resolve(setAccounts(res))
      })
      .catch(err => reject(err));
  });
}

export const resetPwd = (userID, newPwd, oldPwd) => {
  return new Promise((resolve, reject) => {
    resetUserPwd(userID, newPwd, oldPwd)
      .then(res => {
        if (res) {
          resolve(setAccounts(res))
        } else {
          resolve(false)
        }
      })
      .catch(err => reject(err));
  });
}

export const deleteUserByID = (userID) => {
  return new Promise((resolve, reject) => {
    deleteUser(userID)
      .then(res => {
        if (res) {
          resolve(setAccounts(res))
        } else {
          resolve(false)
        }
      })
      .catch(err => reject(err));
  });
}

export const fetchUsers = () => {
  return new Promise((resolve, reject) => {
    getUsers()
      .then(res => {
        resolve(setAccounts(res))
      })
      .catch(err => reject(err));
  });
}

export const loginUser = (account, password) => {
  let _keys = {};
  let seed = decryptkey(password, account.encryptedKey);
  return new Promise((resolve, reject) => {
    getActiveCoinsList()
      .then(activeCoins => {
        for (let i = 0; i < activeCoins.length; i++) {
          if (activeCoins[i].users.includes(account.id)) {
            _keys[activeCoins[i].id] = makeKeyPair(seed, activeCoins[i].id)
          }
        }
        let paymentMethods = {}
        if (account.paymentMethods) {
          paymentMethods = JSON.parse(decryptGeneral(seed, account.paymentMethods))
        }
        let _activeAccount = {id: account.id, wifKey: seed, keys: _keys, paymentMethods}
        resolve(signIntoAccount(_activeAccount))
      })
      .catch(err => reject(err));
  });
}

export const validateLogin = (account, password) => {
  return new Promise((resolve, reject) => {
    checkPinForUser(password, account.id)
      .then(res => {
        if (res !== false) {
          return loginUser(account, password)
        }
        else {
          return res
        }
      })
      .then(loginData => {
        resolve(loginData)
      })
  });
}

export const addKeypair = (seed, coinID, keys) => {
  let keypair = makeKeyPair(seed, coinID)
  let _keys = {}
  Object.assign(_keys, keys)
  _keys[coinID] = keypair

  return updateAccountKeys(_keys)
}
