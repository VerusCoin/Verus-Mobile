import store from "../../../../store"
import { deleteAttestationDataForUser, loadAttestationDataForUser, storeAttestationDataForUser } from "../../../../utils/nativeStore/attestationDataStorage"
import { requestPassword } from "../../../../utils/auth/authBox"
import { encryptkey } from "../../../../utils/seedCrypt"
import { setAttestationData } from "../creators/attestations"

export const saveEncryptedAttestationDataForUser = async (encryptedData = {}, accountHash) => {  
  const attestationData = await storeAttestationDataForUser(encryptedData, accountHash)
  store.dispatch(setAttestationData(encryptedData))
  return attestationData
}

export const clearEncryptedAttestationDataForUser = async (accountHash) => {  
  const attestationData = await deleteAttestationDataForUser(accountHash)
  store.dispatch(setAttestationData({}))
  return attestationData
}

export const modifyAttestationDataForUser = async (data = {}, dataType, accountHash) => {
  let attestationData = {...(await loadAttestationDataForUser(accountHash))}
  attestationData[dataType] = await encryptkey(await requestPassword(), JSON.stringify(data))
  await saveEncryptedAttestationDataForUser(attestationData, accountHash)

  return data
}

export const initAttestationDataForUser = async (accountHash) => {
  const attestationData = await loadAttestationDataForUser(accountHash)
  store.dispatch(setAttestationData(attestationData))
  return attestationData
}