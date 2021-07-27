import store from "../../../../store";
import {
  loadServiceAuthDataForUser,
  storeServiceAuthDataForUser,
} from "../../../../utils/asyncStore/serviceAuthStorage";
import { requestPassword, requestSeeds } from "../../../../utils/auth/authBox";
import { CONNECTED_SERVICES, CONNECTED_SERVICE_CHANNELS, CONNECTED_SERVICE_PROVIDERS } from "../../../../utils/constants/services";
import { encryptkey } from "../../../../utils/seedCrypt";
import { setServiceAuth } from "../creators/services";

export const saveEncryptedServiceAuthDataForUser = async (
  encryptedData = {},
  accountHash
) => {
  const serviceAuthData = await storeServiceAuthDataForUser(
    encryptedData,
    accountHash
  );
  store.dispatch(setServiceAuth(encryptedData));
  return serviceAuthData;
};

export const modifyServiceAuthDataForUser = async (
  data = {},
  service,
  accountHash
) => {
  let serviceAuthData = { ...(await loadServiceAuthDataForUser(accountHash)) };
  serviceAuthData[service] = await encryptkey(
    await requestPassword(),
    JSON.stringify(data)
  );
  await saveEncryptedPersonalDataForUser(serviceAuthData, accountHash);

  return data;
};

export const initServiceAuthDataForUser = async (accountHash) => {
  const serviceAuthData = await loadServiceAuthDataForUser(accountHash);
  store.dispatch(setServiceAuth(serviceAuthData));
  return serviceAuthData;
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