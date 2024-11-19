import store from "../../../../store"
import { deletePersonalDataForUser, loadPersonalDataForUser, storePersonalDataForUser } from "../../../../utils/asyncStore/personalDataStorage"
import { requestPassword, requestPersonalData } from "../../../../utils/auth/authBox"
import { encryptkey } from "../../../../utils/seedCrypt"
import { setPersonalData } from "../creators/personal"

export const saveEncryptedPersonalDataForUser = async (encryptedData = {}, accountHash) => {  
  const personalData = await storePersonalDataForUser(encryptedData, accountHash)
  store.dispatch(setPersonalData(encryptedData))
  return personalData
}

export const clearEncryptedPersonalDataForUser = async (accountHash) => {  
  const personalData = await deletePersonalDataForUser(accountHash)
  store.dispatch(setPersonalData({}))
  return personalData
}

export const modifyPersonalDataForUser = async (data = {}, dataType, accountHash) => {
  let personalData = {...(await loadPersonalDataForUser(accountHash))}
  personalData[dataType] = await encryptkey(await requestPassword(), JSON.stringify(data))
  await saveEncryptedPersonalDataForUser(personalData, accountHash)

  return data
}

export const resetPersonalDataEncryptionForUser = async (accountHash, oldPwd) => {
  let personalData = {...(await loadPersonalDataForUser(accountHash))}

  // Iterate through every key in the personal data object and re-encrypt it with the current password
  for (let key in personalData) {
    if (personalData[key] == null) {
      continue;
    };
    
    const data = await requestPersonalData(key, oldPwd);
    personalData[key] = await encryptkey(await requestPassword(), JSON.stringify(data))
  }

  await saveEncryptedPersonalDataForUser(personalData, accountHash)

  return personalData;
}

export const initPersonalDataForUser = async (accountHash) => {
  const personalData = await loadPersonalDataForUser(accountHash)
  store.dispatch(setPersonalData(personalData))
  return personalData
}