import { PERSONAL_DATA_STORAGE_INTERNAL_KEY } from '../../../env/index'
import { SecureStorage } from '../keychain/secureStore';

export const storePersonalData = (data) => {
  if (typeof data !== 'object') throw new Error(`Personal data store function expected object, received ${typeof data}`)

  return new Promise((resolve, reject) => {
    SecureStorage.setItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(data))
      .then(() => {
        resolve(data);
      })
      .catch(err => reject(err));
  }) 
};

export const loadPersonalData = () => {
  return new Promise((resolve, reject) => {
    SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY)
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

export const clearAllPersonalData = () => {
  return new Promise((resolve, reject) => {
    SecureStorage.removeItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY)
      .then(() => {
        resolve();
      })
      .catch(err => reject(err));
  }) 
};

export const storePersonalDataForUser = async (data, accountHash) => {
  let allPersonalData = {...(await loadPersonalData())}
  allPersonalData[accountHash] = data
  return (await storePersonalData(allPersonalData))[accountHash]
}

export const deletePersonalDataForUser = async (accountHash) => {
  let allPersonalData = {...(await loadPersonalData())}
  delete allPersonalData[accountHash]
  return (await storePersonalData(allPersonalData))[accountHash]
}

export const loadPersonalDataForUser = async (accountHash) => {
  const allPersonalData = await loadPersonalData()

  if (allPersonalData[accountHash] == null)
    return {
      attributes: null,
      contact: null,
      locations: null,
      payment_methods: null,
      images: null,
    };
  else return allPersonalData[accountHash];
};
