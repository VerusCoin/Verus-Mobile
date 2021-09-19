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
  setUserKeyDerivationVersion,
} from "../../utils/asyncStore/asyncStore";
import {
  deriveKeyPair
} from '../../utils/keys'
import {
  decryptkey, encryptkey,
} from '../../utils/seedCrypt'
import { hashAccountId } from '../../utils/crypto/hash';
import { CHANNELS, ELECTRUM, ERC20, ETH, DLIGHT_PRIVATE } from '../../utils/constants/intervalConstants';
import {
  KEY_DERIVATION_VERSION,
} from "../../../env/index";
import { BIOMETRIC_AUTH, SET_ACCOUNTS } from '../../utils/constants/storeType';
import { removeExistingCoin } from './coins/Coins';
import { initSession, requestPassword, requestSeeds } from '../../utils/auth/authBox';
import { clearEncryptedPersonalDataForUser } from './personal/dispatchers/personal';
import { clearEncryptedServiceStoredDataForUser } from './services/dispatchers/services';

export const addUser = (
  userName,
  seeds,
  password,
  users,
  biometry = false,
  keyDerivationVersion = KEY_DERIVATION_VERSION
) => {
  return new Promise((resolve, reject) => {
    storeUser(
      { seeds, password, userName, biometry, keyDerivationVersion },
      users
    )
      .then((res) => {
        resolve(setAccounts(res));
      })
      .catch((err) => reject(err));
  });
};

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

// Requires user to logout and log back in
export const setKeyDerivationVersion = async (userID, keyDerivationVersion) => {
  return new Promise((resolve, reject) => {
    setUserKeyDerivationVersion(userID, keyDerivationVersion)
      .then((accounts) => {
        resolve({
          type: SET_ACCOUNTS,
          payload: { accounts }
        })
      })
      .catch(err => reject(err));
  });
}

export const deleteProfile = async (account, dispatch) => {
  // Remove active coins
  await removeExistingCoin(null, account.id, dispatch, true)

  // Clear encrypted personal data
  clearEncryptedPersonalDataForUser(account.accountHash)

  // Clear service stored data
  clearEncryptedServiceStoredDataForUser(account.accountHash)

  // Delete user from accounts
  dispatch(setAccounts(await deleteUser(account.accountHash)))

  return
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
                  [ELECTRUM]: user.encryptedKey,
                },
                biometry: false,
                keyDerivationVersion:
                  user.keyDerivationVersion == null
                    ? 0
                    : user.keyDerivationVersion,
              };
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

  let seeds = account.encryptedKeys

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

                  const keyObj = await deriveKeyPair(
                    decryptkey(password, seeds[seedChannel]),
                    activeCoins[i].id,
                    channel,
                    account.keyDerivationVersion == null
                      ? 0
                      : account.keyDerivationVersion
                  );

                  _keys[activeCoins[i].id][channel] = {
                    pubKey: keyObj.pubKey,
                    encryptedPrivKey: await encryptkey(password, keyObj.privKey),
                    encryptedViewingKey:
                      keyObj.viewingKey == null
                        ? null
                        : await encryptkey(password, keyObj.viewingKey),
                    addresses: keyObj.addresses,
                  };
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

        resolve(
          authenticateUser(
            {
              id: account.id,
              accountHash: account.accountHash
                ? account.accountHash
                : hashAccountId(account.id),
              seeds,
              keys: _keys,
              paymentMethods: {},
              biometry: account.biometry ? true : false,
              keyDerivationVersion:
                account.keyDerivationVersion == null
                  ? 0
                  : account.keyDerivationVersion,
            },
            await initSession(password)
          )
        );
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

export const addKeypairs = async (
  coinObj,
  keys,
  derivationVersion = KEY_DERIVATION_VERSION
) => {
  let keypairs = {};
  const coinID = coinObj.id;
  const accountPass = await requestPassword()
  const accountSeeds = await requestSeeds()

  for (seedType of CHANNELS) {
    const seed = accountSeeds[seedType]
      ? accountSeeds[seedType]
      : accountSeeds[ELECTRUM];
    if (
      coinObj.compatible_channels.includes(seedType) &&
      (seedType !== DLIGHT_PRIVATE || accountSeeds[seedType])
    ) {
      const keyObj = await deriveKeyPair(
        seed,
        coinID,
        seedType,
        derivationVersion
      );

      keypairs[seedType] = {
        pubKey: keyObj.pubKey,
        encryptedPrivKey: await encryptkey(accountPass, keyObj.privKey),
        encryptedViewingKey:
          keyObj.viewingKey == null
            ? null
            : await encryptkey(accountPass, keyObj.viewingKey),
        addresses: keyObj.addresses,
      };
    }
  }

  return updateAccountKeys({ ...keys, [coinID]: keypairs });
};
