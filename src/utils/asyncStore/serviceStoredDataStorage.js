import AsyncStorage from "@react-native-community/async-storage";
import { SERVICE_STORAGE_INTERNAL_KEY } from "../../../env/index";
import { WYRE_SERVICE_ID } from "../constants/services";

export const storeServiceStoredData = (data) => {
  if (typeof data !== "object")
    throw new Error(
      `Service auth store function expected object, recieved ${typeof data}`
    );

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem(
      SERVICE_STORAGE_INTERNAL_KEY,
      JSON.stringify(data)
    )
      .then(() => {
        resolve(data);
      })
      .catch((err) => reject(err));
  });
};

export const loadServiceStoredData = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY)
      .then((res) => {
        if (!res) {
          resolve({});
        } else {
          _res = JSON.parse(res);
          resolve(_res);
        }
      })
      .catch((err) => reject(err));
  });
};

export const clearServiceStoredData = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.removeItem(SERVICE_STORAGE_INTERNAL_KEY)
      .then(() => {
        resolve();
      })
      .catch((err) => reject(err));
  });
};

export const storeServiceStoredDataForUser = async (data, accountHash) => {
  let allStoredData = { ...(await loadServiceStoredData()) };
  allStoredData[accountHash] = data;
  return (await storeServiceStoredData(allStoredData))[accountHash];
};

export const loadServiceStoredDataForUser = async (accountHash) => {
  const allStoredData = await loadServiceStoredData();

  if (allStoredData[accountHash] == null) return { [WYRE_SERVICE_ID]: null };
  else return allStoredData[accountHash];
};
