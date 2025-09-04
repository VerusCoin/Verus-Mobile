import { SETTINGS_STORAGE_INTERNAL_KEY } from '../../../env/index';
import { SecureStorage } from '../keychain/secureStore';

/**
 * Saves the current settings state object into AsyncStorage and returns 
 * a promise that resolves to the input parameter if the save succeeded
 * @param {Object} settings The current state of the settings object in the redux store
 */
export const storeSettings = (settings) => {
  if (typeof settings !== 'object') throw new Error(`Wallet settings store function expected object, received ${typeof settings}`)

  return new Promise((resolve, reject) => {
    SecureStorage.setItem(SETTINGS_STORAGE_INTERNAL_KEY, JSON.stringify(settings))
      .then(() => {
        resolve(settings);
      })
      .catch(err => reject(err));
  }) 
};

/**
 * Loads the settings object from AsyncStorage, to be dispatched to the redux store. 
 * Returns a promise that resolves to the settings state object or rejects on error. If
 * the object is undefined in AsyncStorage, resolves to an empty object.
 */
export const loadSettings = () => {
  return new Promise((resolve, reject) => {
    SecureStorage.getItem(SETTINGS_STORAGE_INTERNAL_KEY)
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
