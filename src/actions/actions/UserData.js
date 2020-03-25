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
import { sha256, hashAccountId } from '../../utils/crypto/hash';

import WyreService from '../../services/wyreService';
import { ENABLE_WYRE } from '../../utils/constants/constants';


//TODO: Fingerprint authentication

export const addUser = (userName, seeds, password, users) => {
  return new Promise((resolve, reject) => {
    storeUser({ seeds, password, userName }, users)
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
  const { electrum, dlight } = account.encryptedKeys

  let seeds = {
    electrum: electrum != null ? decryptkey(password, electrum) : null,
    dlight: dlight != null ? decryptkey(password, dlight) : null,
  }

  return new Promise((resolve, reject) => {
    getActiveCoinsList()
      .then(activeCoins => {
        for (let i = 0; i < activeCoins.length; i++) {
          if (activeCoins[i].users.includes(account.id)) {
            _keys[activeCoins[i].id] = {
              electrum: electrum != null ? makeKeyPair(seed, activeCoins[i].id) : null,
              dlight: electrum != null ? makeKeyPair(seed, activeCoins[i].id) : null,
            }
          }
        }

        let paymentMethods = {
          ...account.paymentMethods
        }

        if (ENABLE_WYRE) {
          const hashedSeed = sha256(seed).toString('hex');

          WyreService.build().submitAuthToken(hashedSeed).then((response) => {

            const submitAuthTokenResponse = response.data;
  
            paymentMethods.wyre = {
              id: submitAuthTokenResponse.authenticatedAs ?
                submitAuthTokenResponse.authenticatedAs.slice(8) : null,
              key: hashedSeed
            }
  
            resolve(
              signIntoAccount({
                id: account.id,
                accountHash: account.accountHash
                  ? account.accountHash
                  : hashAccountId(account.id),
                seeds,
                keys: _keys,
                paymentMethods
              })
            );
          });
        } else {
          resolve(
            signIntoAccount({
              id: account.id,
              accountHash: account.accountHash
                ? account.accountHash
                : hashAccountId(account.id),
              seeds,
              keys: _keys,
              paymentMethods: {}
            })
          );
        }
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

export const addKeypairs = (accountSeeds, coinID, keys) => {
  let keypairs = {}
  Object.keys(accountSeeds).map(seedType => {
    const seed = accountSeeds[seedType]
    if (seed != null) {
      keypairs[seedType] = makeKeyPair(seed, coinID)
    }
  })

  return updateAccountKeys({...keys, [coinID]: keypairs})
}
