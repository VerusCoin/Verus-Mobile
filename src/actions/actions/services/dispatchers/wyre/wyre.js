import store from "../../../../../store"
import { requestServiceStoredData } from "../../../../../utils/auth/authBox"
import { WYRE_SERVICE_ID } from "../../../../../utils/constants/services"
import { modifyServiceStoredDataForUser } from "../services"
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from "../../../updates/sessionRequests"

const getSessionScope = requestContext =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null) ||
  captureSessionScope(store.getState())

const assertSessionCurrent = (sessionScope, requestContext) => {
  if (
    requestContext?.signal?.aborted === true ||
    !sessionScopeIsCurrent(store.getState(), sessionScope)
  ) {
    const error = new Error(
      "Account changed while Wyre document data was being updated."
    )
    error.code = "SESSION_CHANGED"
    throw error
  }
}

export const mapWyreDocumentIds = async (
  fieldId,
  documentIds,
  uris,
  hashes,
  requestContext
) => {
  const sessionScope = getSessionScope(requestContext)
  const scopedRequestContext = {
    ...(requestContext || {}),
    sessionScope,
  }

  assertSessionCurrent(sessionScope, scopedRequestContext)

  if (sessionScope.accountHash == null) {
    throw new Error(
      "You must be signed in to map a wyre document id"
    );
  }

  const serviceData = await requestServiceStoredData(WYRE_SERVICE_ID)
  assertSessionCurrent(sessionScope, scopedRequestContext)
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
    sessionScope.accountHash,
    scopedRequestContext
  );
}
