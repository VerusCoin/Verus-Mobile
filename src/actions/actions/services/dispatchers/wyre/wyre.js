import store from "../../../../../store"
import { requestServiceStoredData } from "../../../../../utils/auth/authBox"
import { WYRE_SERVICE_ID } from "../../../../../utils/constants/services"
import { modifyServiceStoredDataForUser } from "../services"

export const mapWyreDocumentIds = async (fieldId, documentIds, uris, hashes) => {
  const state = store.getState()

  if (state.authentication.activeAccount == null) {
    throw new Error(
      "You must be signed in to map a wyre document id"
    );
  }

  const serviceData = await requestServiceStoredData(WYRE_SERVICE_ID)
  const currentDocumentIds =
    serviceData.document_ids == null ? {} : serviceData.document_ids;
  const currentFieldDocumentMap =
    serviceData.field_document_map == null ? {} : serviceData.field_document_map;
  
  let document_ids = {
    ...currentDocumentIds,
  }

  documentIds.map((id, index) => {
    const uri = uris[index]
    const hash = hashes[index]

    document_ids[id] = {
      uri,
      hash
    }
  })

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      document_ids,
      field_document_map: {
        ...currentFieldDocumentMap,
        [fieldId]: documentIds
      }
    },
    WYRE_SERVICE_ID,
    state.authentication.activeAccount.accountHash
  );
}