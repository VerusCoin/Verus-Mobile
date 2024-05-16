var RNFS = require('react-native-fs');
import { ATTESTATION_DATA_STORAGE_INTERNAL_KEY } from '../../../env/index'

export const storeAttestationData = (data) => {
  if (typeof data !== 'object') throw new Error(`Attestation data store function expected object, received ${typeof data}`)

  return new Promise((resolve, reject) => {
    RNFS.writeFile(RNFS.DocumentDirectoryPath + `/${ATTESTATION_DATA_STORAGE_INTERNAL_KEY}.txt`, JSON.stringify(data), 'utf8')
      .then((success) => {
        resolve(data);
      })
      .catch(err => {
        reject(err)
      })
  })
};

export const loadAttestationData = () => {
  return new Promise((resolve, reject) => {
    RNFS.readFile(RNFS.DocumentDirectoryPath + `/${ATTESTATION_DATA_STORAGE_INTERNAL_KEY}.txt`, "utf8")
      .then(res => {
        if (!res) {
          resolve({});
        } else {
          _res = JSON.parse(res);
          resolve(_res);
        }
      })
      .catch(err => {
        if (err.code === 'ENOENT') {
          resolve({});
        } else {
          reject(err);
        }
      });
  })
};

export const clearAllAttestationData = () => {
  return new Promise((resolve, reject) => {
    RNFS.unlink(RNFS.DocumentDirectoryPath + `/${ATTESTATION_DATA_STORAGE_INTERNAL_KEY}.txt`)
      .then(() => {
        resolve();
      })
      .catch(err => reject(err));
  })
};

export const storeAttestationDataForUser = async (data, accountHash) => {
  let allAttestationData = { ...(await loadAttestationData()) }
  allAttestationData[accountHash] = data
  return (await storeAttestationData(allAttestationData))[accountHash]
}

export const deleteAttestationDataForUser = async (accountHash) => {
  let allAttestationData = { ...(await loadAttestationData()) }
  delete allAttestationData[accountHash]
  return (await storeAttestationData(allAttestationData))[accountHash]
}

export const loadAttestationDataForUser = async (accountHash) => {
  const allAttestationData = await loadAttestationData()

  if (allAttestationData[accountHash] == null)
    return {
      attestations: null
    };
  else return allAttestationData[accountHash];
};
