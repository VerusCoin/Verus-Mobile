import {
  setAccounts,
  updateAccountKeys,
  authenticateUser
} from '../actionCreators';
import {
  storeUser,
  getUsers,
  getActiveCoinList,
  checkPinForUser,
  resetUserPwd,
  addEncryptedKeyToUser,
  deleteUser,
  setUserBiometry,
  setUsers,
} from "../../utils/asyncStore/asyncStore";
import {
  makeKeyPair
} from '../../utils/keys'
import {
  decryptkey,
} from '../../utils/seedCrypt'
import { sha256, hashAccountId } from '../../utils/crypto/hash';

import WyreService from '../../services/wyreService';
import { CHANNELS, ELECTRUM, ERC20, ETH } from '../../utils/constants/intervalConstants';
import { arrayToObject } from '../../utils/objectManip';
import { ENABLE_FIAT_GATEWAY } from '../../../env/main.json';
import { BIOMETRIC_AUTH } from '../../utils/constants/storeType';
import { fetchActiveCoins, removeExistingCoin } from './coins/Coins';

export const addUser = (userName, seeds, password, users, biometry = false) => {
  return new Promise((resolve, reject) => {
    storeUser({ seeds, password, userName, biometry }, users)
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

export const addEncryptedKey = (accountHash, channel, seed, password) => {
  return new Promise((resolve, reject) => {
    addEncryptedKeyToUser(accountHash, channel, seed, password)
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

export const setBiometry = (userID, biometry) => {
  return new Promise((resolve, reject) => {
    setUserBiometry(userID, biometry)
      .then((accounts) => {
        resolve({
          type: BIOMETRIC_AUTH,
          payload: { biometry, userID, accounts }
        })
      })
      .catch(err => reject(err));
  });
}

export const deleteProfile = (account, dispatch) => {
  return new Promise(async (resolve, reject) => {
    try {
      await removeExistingCoin(null, account.id, dispatch, true)
      const deleteAction = setAccounts(await deleteUser(account.accountHash))
      dispatch(deleteAction)

      resolve()
    } catch(e) {
      reject(e)
    }
  });
}

export const fetchUsers = () => {
  return new Promise((resolve, reject) => {
    getUsers()
      .then(async (users) => {

        // Update for new user representation post v0.2.0
        if (users.some((value) => (value.encryptedKeys == null && value.encryptedKey))) {
          console.warn("Updating users to key structure post v0.2.0")

          users = users.map(user => {
            if (user.encryptedKeys == null && user.encryptedKey) {
              return {
                id: user.id,
                accountHash: hashAccountId(user.id),
                encryptedKeys: {
                  [ELECTRUM]: user.encryptedKey
                },
                biometry: false
              }
            } else return user
          })

          await setUsers(users)
        }

        resolve(setAccounts(users))
      })
      .catch(err => reject(err));
  });
}

export const authenticateAccount = async (account, password) => {
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
      .then(async activeCoins => {
        for (let i = 0; i < activeCoins.length; i++) {
          if (activeCoins[i].users.includes(account.id)) {
            _keys[activeCoins[i].id] = {}

            for (const channel of CHANNELS) {
              if (
                (activeCoins[i].compatible_channels.includes(
                  channel
                ) &&
                  seeds[channel]) ||
                channel === ETH ||
                channel === ERC20
              ) {
                try {
                  const seedChannel =
                    channel === ETH || channel === ERC20
                      ? ELECTRUM
                      : channel;

                  _keys[activeCoins[i].id][
                    channel
                  ] = await makeKeyPair(
                    seeds[seedChannel],
                    activeCoins[i].id,
                    channel
                  );
                } catch (e) {
                  console.warn(
                    `Key generation failed for ${
                      activeCoins[i].id
                    } channel ${channel}`
                  );
                  console.warn(e);
                }
              }
            }
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
                paymentMethods,
                biometry: account.biometry ? true : false
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
              paymentMethods: {},
              biometry: account.biometry ? true : false
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
      .then(() => {
        return authenticateAccount(account, password);
      })
      .then(loginData => {
        resolve(loginData);
      })
      .catch(err => {
        reject(err)
        console.warn(err);
      });
  });
}

export const addKeypairs = async (accountSeeds, coinObj, keys) => {
  let keypairs = {}
  const coinID = coinObj.id

  for (seedType of CHANNELS) {
    const seed = accountSeeds[seedType] ? accountSeeds[seedType] : accountSeeds[ELECTRUM]
    if (coinObj.compatible_channels.includes(seedType)) {
      keypairs[seedType] = await makeKeyPair(seed, coinID, seedType)
    }
  }

  return updateAccountKeys({...keys, [coinID]: keypairs})
}
