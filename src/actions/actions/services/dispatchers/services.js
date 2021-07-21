import store from "../../../../store";
import {
  loadServiceAuthDataForUser,
  storeServiceAuthDataForUser,
} from "../../../../utils/asyncStore/serviceAuthStorage";
import { requestPassword } from "../../../../utils/auth/authBox";
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
