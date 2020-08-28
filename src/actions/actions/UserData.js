import {
  setAccounts,
  setFingerAuth,
  signIntoAccount,
  updateAccountKeys,
  authenticateUser
} from '../actionCreators';
import {
  storeUser,
  getUsers,
  getActiveCoinList,
  checkPinForUser,
  resetUserPwd,
  deleteUser
} from '../../utils/asyncStore/asyncStore';
import {
  makeKeyPair
} from '../../utils/keys'
import {
  decryptkey,
} from '../../utils/seedCrypt'
import { sha256, hashAccountId } from '../../utils/crypto/hash';

import WyreService from '../../services/wyreService';
import { CHANNELS, ELECTRUM } from '../../utils/constants/intervalConstants';
import { arrayToObject } from '../../utils/objectManip';
import { ENABLE_FIAT_GATEWAY } from '../../../env/main.json';


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

export const authenticateAccount = (account, password) => {
  let _keys = {};

  let seeds = arrayToObject(
    CHANNELS,
    (acc, key) =>
      account.encryptedKeys[key]
        ? decryptkey(password, account.encryptedKeys[key])
        : null,
    true
  );

  return new Promise((resolve, reject) => {
    getActiveCoinList()
      .then(activeCoins => {
        for (let i = 0; i < activeCoins.length; i++) {
          if (activeCoins[i].users.includes(account.id)) {
            _keys[activeCoins[i].id] = arrayToObject(
              CHANNELS,
              (acc, key) =>
                activeCoins[i].compatible_channels.includes(key)
                  ? makeKeyPair(
                      seeds[key] ? seeds[key] : seeds.electrum,
                      activeCoins[i].id,
                      key
                    )
                  : null,
              true
            );
          }
        }

        let paymentMethods = {
          ...account.paymentMethods
        }

        if (ENABLE_FIAT_GATEWAY) {
          const hashedSeed = sha256(seeds.electrum).toString('hex');

          WyreService.build().submitAuthToken(hashedSeed).then((response) => {

            const submitAuthTokenResponse = response.data;
  
            paymentMethods.wyre = {
              id: submitAuthTokenResponse.authenticatedAs ?
                submitAuthTokenResponse.authenticatedAs.slice(8) : null,
              key: hashedSeed
            }
  
            resolve(
              authenticateUser({
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
            authenticateUser({
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
          return authenticateAccount(account, password);
        } else {
          return res;
        }
      })
      .then(loginData => {
        resolve(loginData);
      })
      .catch(err => {
        console.warn(err);
      });
  });
}

export const addKeypairs = (accountSeeds, coinObj, keys) => {
  let keypairs = {}
  const coinID = coinObj.id

  CHANNELS.map(seedType => {
    const seed = accountSeeds[seedType] ? accountSeeds[seedType] : accountSeeds[ELECTRUM]
    if (coinObj.compatible_channels.includes(seedType)) {
      keypairs[seedType] = makeKeyPair(seed, coinID, seedType)
    }
  })

  return updateAccountKeys({...keys, [coinID]: keypairs})
}
