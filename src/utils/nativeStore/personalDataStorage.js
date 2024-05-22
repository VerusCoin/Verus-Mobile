var RNFS = require('react-native-fs');
import { PERSONAL_DATA_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storePersonalData = (data) => {
  if (typeof data !== 'object') throw new Error(`Personal data store function expected object, received ${typeof data}`)

  return new Promise((resolve, reject) => {
    RNFS.writeFile(RNFS.DocumentDirectoryPath + `/${PERSONAL_DATA_STORAGE_INTERNAL_KEY}.txt`, JSON.stringify(data), 'utf8')
      .then((success) => {
        resolve(data);
      })
      .catch(err => {
        reject(err)
      })
  })
};

export const loadPersonalData = () => {
  return new Promise((resolve, reject) => {
    RNFS.readFile(RNFS.DocumentDirectoryPath + `/${PERSONAL_DATA_STORAGE_INTERNAL_KEY}.txt`, "utf8")
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
    RNFS.unlink(RNFS.DocumentDirectoryPath + `/${PERSONAL_DATA_STORAGE_INTERNAL_KEY}.txt`)
      .then(() => {
        resolve();
      })
      .catch(err => reject(err));
  })
};

export const storePersonalDataForUser = async (data, accountHash) => {
  let allPersonalData = { ...(await loadPersonalData()) }
  allPersonalData[accountHash] = data
  return (await storePersonalData(allPersonalData))[accountHash]
}

export const deletePersonalDataForUser = async (accountHash) => {
  let allPersonalData = { ...(await loadPersonalData()) }
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
