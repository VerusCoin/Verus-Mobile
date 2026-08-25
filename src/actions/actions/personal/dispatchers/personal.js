import store from "../../../../store"
import { deletePersonalDataForUser, loadPersonalDataForUser, storePersonalDataForUser } from "../../../../utils/asyncStore/personalDataStorage"
import { requestPassword, requestPersonalData } from "../../../../utils/auth/authBox"
import { encryptkey } from "../../../../utils/seedCrypt"
import { setPersonalData } from "../creators/personal"
import { queuePersonalStorageWrite } from "../../../../utils/asyncStore/passwordProtectedStorageQueue"
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../updates/sessionRequests'

export const saveEncryptedPersonalDataForUser = async (
  encryptedData = {},
  accountHash,
  sessionScope = captureSessionScope(store.getState(), accountHash),
) => {
  if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
    const error = new Error('Account changed while personal data was being updated.')
    error.code = 'SESSION_CHANGED'
    throw error
  }

  const personalData = await storePersonalDataForUser(encryptedData, accountHash)
  store.dispatch(scopeSessionAction(setPersonalData(encryptedData), sessionScope))
  return personalData
}

export const clearEncryptedPersonalDataForUser = async (accountHash) => {
  const sessionScope = captureSessionScope(store.getState(), accountHash)

  return queuePersonalStorageWrite(async () => {
    const personalData = await deletePersonalDataForUser(accountHash)
    store.dispatch(scopeSessionAction(setPersonalData({}), sessionScope))
    return personalData
  })
}

export const modifyPersonalDataForUser = async (data = {}, dataType, accountHash) => {
  const sessionScope = captureSessionScope(store.getState(), accountHash)

  return queuePersonalStorageWrite(async () => {
    let personalData = {...(await loadPersonalDataForUser(accountHash))}
    personalData[dataType] = await encryptkey(await requestPassword(sessionScope), JSON.stringify(data))
    await saveEncryptedPersonalDataForUser(personalData, accountHash, sessionScope)

    return data
  })
}

export const resetPersonalDataEncryptionForUser = async (accountHash, oldPwd) => {
  const sessionScope = captureSessionScope(store.getState(), accountHash)

  return queuePersonalStorageWrite(async () => {
    let personalData = {...(await loadPersonalDataForUser(accountHash))}

    // Iterate through every key in the personal data object and re-encrypt it with the current password
    for (let key in personalData) {
      if (personalData[key] == null) {
        continue;
      };

      const data = await requestPersonalData(key, oldPwd);
      personalData[key] = await encryptkey(await requestPassword(sessionScope), JSON.stringify(data))
    }

    await saveEncryptedPersonalDataForUser(personalData, accountHash, sessionScope)

    return personalData;
  })
}

export const initPersonalDataForUser = async (accountHash) => {
  const sessionScope = captureSessionScope(store.getState(), accountHash)
  const personalData = await loadPersonalDataForUser(accountHash)
  store.dispatch(scopeSessionAction(setPersonalData(personalData), sessionScope))
  return personalData
}
