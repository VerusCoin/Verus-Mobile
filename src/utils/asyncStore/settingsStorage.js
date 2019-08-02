import AsyncStorage from '@react-native-community/async-storage';

/**
 * Saves the current state of the walletSettings state object into AsyncStorage and returns 
 * a promise that resolves to the input parameter if the save succeeded
 * @param {Object} walletSettingsState The current state of the walletSettings object in the redux store
 */
export const storeWalletSettings = (walletSettingsState) => {
  if (typeof walletSettingsState !== 'object') throw new Error(`Wallet settings store function expected object, recieved ${typeof walletSettingsState}`)

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem('walletSettings', JSON.stringify(walletSettingsState))
      .then(() => {
        resolve(walletSettingsState);
      })
      .catch(err => reject(err));
  }) 
};

/**
 * Loads the walletSettings object from AsyncStorage, to be dispatched to the redux store. 
 * Returns a promise that resolves to the walletSettings state object or rejects on error. If
 * the object is undefined in AsyncStorage, it resolves to an empty object.
 */
export const loadWalletSettings = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem('walletSettings')
      .then(res => {
        if (!res) {
          resolve({});
        } else {
          _res = JSON.parse(res);
          resolve(_res);
        }
      })
      .catch(err => reject(err));
  }) 
};