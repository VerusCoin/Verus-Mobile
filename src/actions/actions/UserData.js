import {
  setAccounts,
  updateAccountKeys,
  authenticateUser,
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
  setUserDisabledServices,
  setUserTestnetOverrides,
} from '../../utils/asyncStore/asyncStore';
import {deriveKeyPair} from '../../utils/keys';
import {decryptkey, encryptkey} from '../../utils/seedCrypt';
import {hashAccountId} from '../../utils/crypto/hash';
import {
  CHANNELS,
  ELECTRUM,
  ERC20,
  ETH,
  DLIGHT_PRIVATE,
  VRPC,
  WYRE_SERVICE,
} from '../../utils/constants/intervalConstants';
import {
  KEY_DERIVATION_VERSION,
  SERVICES_DISABLED_DEFAULT,
} from '../../../env/index';
import {
  BIOMETRIC_AUTH,
  SET_ACCOUNTS,
  UPDATE_ACCOUNT_DISABLED_SERVICES,
  UPDATE_ACCOUNT_TESTNET_OVERRIDES,
} from '../../utils/constants/storeType';
import {removeExistingCoin} from './coins/Coins';
import {
  initSession,
  requestPassword,
  requestSeeds,
} from '../../utils/auth/authBox';
import {clearEncryptedPersonalDataForUser} from './personal/dispatchers/personal';
import {clearEncryptedServiceStoredDataForUser} from './services/dispatchers/services';
import {clearActiveAccountLifecycles} from './account/dispatchers/account';
import {WYRE_SERVICE_ID} from '../../utils/constants/services';

export const addUser = async (
  userName,
  seeds,
  password,
  users,
  biometry = false,
  keyDerivationVersion = KEY_DERIVATION_VERSION,
  disabledServices = SERVICES_DISABLED_DEFAULT,
  testnetOverrides = {},
) => {
  const res = await storeUser(
    {
      seeds,
      password,
      userName,
      biometry,
      keyDerivationVersion,
      disabledServices,
      testnetOverrides,
    },
    users,
  )

  return setAccounts(res);
};

export const resetPwd = (accountHash, newPwd, oldPwd) => {
  return new Promise((resolve, reject) => {
    resetUserPwd(accountHash, newPwd, oldPwd)
      .then(res => {
        if (res) {
          resolve(setAccounts(res));
        } else {
          resolve(false);
        }
      })
      .catch(err => reject(err));
  });
};

export const addEncryptedKey = (accountHash, channel, seed, password) => {
  return new Promise((resolve, reject) => {
    addEncryptedKeyToUser(accountHash, channel, seed, password)
      .then(res => {
        if (res) {
          resolve(setAccounts(res));
        } else {
          resolve(false);
        }
      })
      .catch(err => reject(err));
  });
};

export const setBiometry = (accountHash, biometry) => {
  return new Promise((resolve, reject) => {
    setUserBiometry(accountHash, biometry)
      .then(accounts => {
        resolve({
          type: BIOMETRIC_AUTH,
          payload: {biometry, accountHash, accounts},
        });
      })
      .catch(err => reject(err));
  });
};

// Requires user to logout and log back in
export const setKeyDerivationVersion = async (accountHash, keyDerivationVersion) => {
  return new Promise((resolve, reject) => {
    setUserKeyDerivationVersion(accountHash, keyDerivationVersion)
      .then(accounts => {
        resolve({
          type: SET_ACCOUNTS,
          payload: {accounts},
        });
      })
      .catch(err => reject(err));
  });
};

export const setDisabledServices = async (accountHash, disabledServices) => {
  return new Promise((resolve, reject) => {
    setUserDisabledServices(accountHash, disabledServices)
      .then(accounts => {
        resolve({
          type: UPDATE_ACCOUNT_DISABLED_SERVICES,
          payload: {disabledServices, accounts},
        });
      })
      .catch(err => reject(err));
  });
};

export const setTestnetOverrides = async (accountHash, testnetOverrides) => {
  return new Promise((resolve, reject) => {
    setUserTestnetOverrides(accountHash, testnetOverrides)
      .then(accounts => {
        resolve({
          type: UPDATE_ACCOUNT_TESTNET_OVERRIDES,
          payload: {testnetOverrides, accounts},
        });
      })
      .catch(err => reject(err));
  });
};

export const deleteProfile = async (account, dispatch) => {
  // Clear existing account lifecycles
  await clearActiveAccountLifecycles();

  // Remove active coins
  await removeExistingCoin(null, account.id, dispatch, true);

  // Clear encrypted personal data
  clearEncryptedPersonalDataForUser(account.accountHash);

  // Clear service stored data
  clearEncryptedServiceStoredDataForUser(account.accountHash);

  // Delete user from accounts
  dispatch(setAccounts(await deleteUser(account.accountHash)));

  return;
};

export const fetchUsers = () => {
  return new Promise((resolve, reject) => {
    getUsers()
      .then(async users => {
        // Update for new user representation post v0.2.0
        if (
          users.some(value => value.encryptedKeys == null && value.encryptedKey)
        ) {
          console.warn('Updating users to key structure post v0.2.0');

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
                disabledServices:
                  user.disabledServices == null ? {} : user.disabledServices,
                testnetOverrides:
                  user.testnetOverrides == null ? {} : user.testnetOverrides,
              };
            } else {
              return user;
            }
          });

          await setUsers(users);
        }

        // Update testnet overrides to include ETH
        if (
          users.some(
            value =>
              value.testnetOverrides != null &&
              value.testnetOverrides.hasOwnProperty('VRSC') &&
              !value.testnetOverrides.hasOwnProperty('ETH'),
          )
        ) {
          console.warn('Updating testnet profile to account for goerli ETH');

          users = users.map(user => {
            if (
              user.testnetOverrides != null &&
              user.testnetOverrides.hasOwnProperty('VRSC') &&
              !user.testnetOverrides.hasOwnProperty('ETH')
            ) {
              return {
                ...user,
                testnetOverrides: {...user.testnetOverrides, ETH: 'GETH'},
              };
            } else {
              return user;
            }
          });

          await setUsers(users);
        }

        resolve(setAccounts(users));
      })
      .catch(err => reject(err));
  });
};

export const authenticateAccount = async (account, password) => {
  let _keys = {};

  let seeds = account.encryptedKeys;

  return new Promise((resolve, reject) => {
    getActiveCoinList()
      .then(async activeCoins => {
        for (let i = 0; i < activeCoins.length; i++) {
          if (activeCoins[i].users.includes(account.id)) {
            _keys[activeCoins[i].id] = {};

            for (const channel of CHANNELS) {
              if (
                (activeCoins[i].compatible_channels.includes(channel) &&
                  seeds[channel]) ||
                channel === ETH ||
                channel === ERC20 ||
                channel === VRPC
              ) {
                try {
                  const seedChannel =
                    channel === ETH || channel === ERC20 || channel === VRPC
                      ? ELECTRUM
                      : channel;

                  if (seeds[seedChannel] == null) throw new Error('No seed for channel ' + seedChannel);

                  const decryptedSeed = decryptkey(password, seeds[seedChannel]);

                  if (!decryptedSeed) throw new Error('Failed to decrypt seed for channel ' + seedChannel);

                  const keyObj = await deriveKeyPair(
                    decryptedSeed,
                    activeCoins[i],
                    channel,
                    account.keyDerivationVersion == null
                      ? 0
                      : account.keyDerivationVersion,
                  );

                  _keys[activeCoins[i].id][channel] = {
                    pubKey: keyObj.pubKey,
                    encryptedPrivKey: await encryptkey(
                      password,
                      keyObj.privKey,
                    ),
                    encryptedViewingKey:
                      keyObj.viewingKey == null
                        ? null
                        : await encryptkey(password, keyObj.viewingKey),
                    addresses: keyObj.addresses,
                  };
                } catch (e) {
                  console.warn(
                    `Key generation failed for ${activeCoins[i].display_ticker} channel ${channel}`,
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
              disabledServices:
                account.disabledServices == null
                  ? account.encryptedKeys && account.encryptedKeys[WYRE_SERVICE]
                    ? {}
                    : {[WYRE_SERVICE_ID]: true}
                  : account.disabledServices,
              testnetOverrides:
                account.testnetOverrides == null
                  ? {}
                  : account.testnetOverrides,
            },
            await initSession(password),
          ),
        );
      })
      .catch(err => reject(err));
  });
};

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
        reject(err);
        console.warn(err);
      });
  });
};

export const addKeypairs = async (
  coinObj,
  keys,
  derivationVersion = KEY_DERIVATION_VERSION,
) => {
  let keypairs = {};
  const coinID = coinObj.id;
  const accountPass = await requestPassword();
  const accountSeeds = await requestSeeds();

  for (seedType of CHANNELS) {
    const seed = accountSeeds[seedType]
      ? accountSeeds[seedType]
      : accountSeeds[ELECTRUM];

    if (!seed) throw new Error('No seed found for account');
    
    if (
      coinObj.compatible_channels.includes(seedType) &&
      (seedType !== DLIGHT_PRIVATE || accountSeeds[seedType])
    ) {
      const keyObj = await deriveKeyPair(
        seed,
        coinObj,
        seedType,
        derivationVersion,
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

  return updateAccountKeys({...keys, [coinID]: keypairs});
};
