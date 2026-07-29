import store from "../../../../store";
import {
  deleteServiceStoredDataForUser,
  loadServiceStoredDataForUser,
  storeServiceStoredDataForUser,
} from "../../../../utils/asyncStore/serviceStoredDataStorage";
import { requestPassword, requestServiceStoredData } from "../../../../utils/auth/authBox";
import {
  CONNECTED_SERVICES,
  WYRE_SERVICE_ID,
} from "../../../../utils/constants/services";
import { decryptkey, encryptkey } from "../../../../utils/seedCrypt";
import WyreProvider from "../../../../utils/services/WyreProvider";
import { setServiceStored } from "../creators/services";

let serviceStorageWriteQueue = Promise.resolve();

const queueServiceStorageWrite = operation => {
  const queued = serviceStorageWriteQueue.then(operation, operation);

  serviceStorageWriteQueue = queued.catch(() => {});
  return queued;
};

const decryptServiceData = (encryptedData, password, service) => {
  if (encryptedData == null) return {};

  const decrypted = decryptkey(password, encryptedData);

  if (decrypted === false) {
    throw new Error("Unable to decrypt service stored data for " + service);
  }

  try {
    return JSON.parse(decrypted);
  } catch (_) {
    throw new Error("Unable to parse service stored data for " + service);
  }
};

export const saveEncryptedServiceStoredDataForUser = async (
  encryptedData = {},
  accountHash
) => {
  const serviceStoredData = await storeServiceStoredDataForUser(
    encryptedData,
    accountHash
  );
  store.dispatch(setServiceStored(encryptedData));
  return serviceStoredData;
};

export const clearEncryptedServiceStoredDataForUser = async (
  accountHash
) => {
  return queueServiceStorageWrite(async () => {
    const serviceStoredData = await deleteServiceStoredDataForUser(
      accountHash
    );
    store.dispatch(setServiceStored({}));
    return serviceStoredData;
  });
};

export const modifyServiceStoredDataForUser = async (
  data = {},
  service,
  accountHash
) => {
  return queueServiceStorageWrite(async () => {
    const serviceStoredData = {
      ...(await loadServiceStoredDataForUser(accountHash)),
    };
    const password = await requestPassword();
    const currentData = decryptServiceData(
      serviceStoredData[service],
      password,
      service,
    );
    const nextData =
      typeof data === "function" ? await data(currentData) : data;

    serviceStoredData[service] = await encryptkey(
      password,
      JSON.stringify(nextData)
    );
    await saveEncryptedServiceStoredDataForUser(serviceStoredData, accountHash);

    return nextData;
  });
};

export const resetServicesStoredEncryptionForUser = async (
  accountHash,
  oldPwd
) => {
  return queueServiceStorageWrite(async () => {
    let serviceStoredData = { ...(await loadServiceStoredDataForUser(accountHash)) };

    // Iterate through every key in the services data object and re-encrypt it with the current password
    for (let key in serviceStoredData) {
      if (serviceStoredData[key] == null) {
        continue;
      };

      const data = await requestServiceStoredData(key, oldPwd);
      serviceStoredData[key] = await encryptkey(await requestPassword(), JSON.stringify(data))
    }

    await saveEncryptedServiceStoredDataForUser(serviceStoredData, accountHash);

    return serviceStoredData;
  });
};

export const initServiceStoredDataForUser = async (accountHash) => {
  const serviceStoredData = await loadServiceStoredDataForUser(accountHash);
  store.dispatch(setServiceStored(serviceStoredData));
  return serviceStoredData;
};

export const resetServices = async () => {
  const CONNECTED_SERVICE_PROVIDERS = {
    [WYRE_SERVICE_ID]: WyreProvider
  }

  for (const connectedService of CONNECTED_SERVICES) {    
    try {
      if (CONNECTED_SERVICE_PROVIDERS[connectedService]) {
        await CONNECTED_SERVICE_PROVIDERS[connectedService].reset();
      }
    } catch (e) {
      console.warn(e);
    }
  }
};
