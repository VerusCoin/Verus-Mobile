import store from "../../../../store";
import {
  clearServiceStoredData,
  loadServiceStoredDataForUser,
  storeServiceStoredDataForUser,
} from "../../../../utils/asyncStore/serviceStoredDataStorage";
import { requestPassword, requestSeeds } from "../../../../utils/auth/authBox";
import { CONNECTED_SERVICES, CONNECTED_SERVICE_CHANNELS, CONNECTED_SERVICE_PROVIDERS } from "../../../../utils/constants/services";
import { encryptkey } from "../../../../utils/seedCrypt";
import { setServiceStored } from "../creators/services";

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

export const modifyServiceStoredDataForUser = async (
  data = {},
  service,
  accountHash
) => {
  let serviceStoredData = { ...(await loadServiceStoredDataForUser(accountHash)) };
  serviceStoredData[service] = await encryptkey(
    await requestPassword(),
    JSON.stringify(data)
  );
  await saveEncryptedServiceStoredDataForUser(serviceStoredData, accountHash);

  return data;
};

export const initServiceStoredDataForUser = async (accountHash) => {
  const serviceStoredData = await loadServiceStoredDataForUser(accountHash);
  store.dispatch(setServiceStored(serviceStoredData));
  return serviceStoredData;
};

export const authenticateServices = async () => {
  const seeds = await requestSeeds()
  
  for (const connectedService of CONNECTED_SERVICES) {
    if (
      CONNECTED_SERVICE_CHANNELS[connectedService] &&
      CONNECTED_SERVICE_PROVIDERS[connectedService] &&
      seeds[CONNECTED_SERVICE_CHANNELS[connectedService]]
    ) {
      try {
        await CONNECTED_SERVICE_PROVIDERS[connectedService].authenticate(
          seeds[CONNECTED_SERVICE_CHANNELS[connectedService]]
        );
      } catch(e) {
        console.warn(e)
      }
    }
  }
}