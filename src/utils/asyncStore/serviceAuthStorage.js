import AsyncStorage from "@react-native-community/async-storage";
import { SERVICE_AUTH_STORAGE_INTERNAL_KEY } from "../../../env/index";
import { WYRE_SERVICE_ID } from "../constants/services";

export const storeServiceAuthData = (data) => {
  if (typeof data !== "object")
    throw new Error(
      `Service auth store function expected object, recieved ${typeof data}`
    );

  return new Promise((resolve, reject) => {
    AsyncStorage.setItem(
      SERVICE_AUTH_STORAGE_INTERNAL_KEY,
      JSON.stringify(data)
    )
      .then(() => {
        resolve(data);
      })
      .catch((err) => reject(err));
  });
};

export const loadServiceAuthData = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.getItem(SERVICE_AUTH_STORAGE_INTERNAL_KEY)
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

export const clearServiceAuthData = () => {
  return new Promise((resolve, reject) => {
    AsyncStorage.removeItem(SERVICE_AUTH_STORAGE_INTERNAL_KEY)
      .then(() => {
        resolve();
      })
      .catch((err) => reject(err));
  });
};

export const storeServiceAuthDataForUser = async (data, accountHash) => {
  let allAuthData = { ...(await loadServiceAuthData()) };
  allAuthData[accountHash] = data;
  return (await storeServiceAuthData(allAuthData))[accountHash];
};

export const loadServiceAuthDataForUser = async (accountHash) => {
  const allAuthData = await loadServiceAuthData();

  if (allAuthData[accountHash] == null) return { [WYRE_SERVICE_ID]: null };
  else return allAuthData[accountHash];
};
