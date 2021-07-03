import AsyncStorage from '@react-native-community/async-storage';
import { PERSONAL_DATA_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storePersonalData = (data) => {
  if (typeof data !== 'object') throw new Error(`Personal data store function expected object, recieved ${typeof data}`)

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY, JSON.stringify(data))
      .then(() => {
        resolve(data);
      })
      .catch(err => reject(err));
  }) 
};

export const loadPersonalData = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY)
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
    AsyncStorage.removeItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY)
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

export const loadPersonalDataForUser = async (accountHash) => {
  const allPersonalData = await loadPersonalData()

  if (allPersonalData[accountHash] == null)
    return { attributes: null, contact: null, locations: null };
  else return allPersonalData[accountHash];
};