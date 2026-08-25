import {
  UserDataRequestOrdinalVDXFObject,
} from "verus-typescript-primitives";
import {
  getRequestScope,
  getSignedRequestDisplayProps,
} from "./requestDisplayUtils";
import { getUserDataRequestedSignerID } from "../userData/requestedSigner";

export const handleUserDataRequestVDXFObject = async (request, response, detailIndex) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof UserDataRequestOrdinalVDXFObject)) {
    throw new Error("Invalid UserDataRequest detail at index " + detailIndex);
  }

  const requestDetail = detail.data;
  const displayProps = await getSignedRequestDisplayProps(request);
  const credentialRequests = requestDetail.searchDataKey.map(item => {
    const key = Object.keys(item)[0];
    return {
      key,
      label: key,
    };
  });

  return {
    displayProps: {
      ...displayProps,
      detailsBufferString: requestDetail.toBuffer().toString("hex"),
      credentialRequests,
      requestedKeys: requestDetail.requestedKeys || [],
      requestScope: getRequestScope(request),
      requestedSignerID: getUserDataRequestedSignerID(requestDetail),
      hasRequestID: requestDetail.hasRequestID(),
      requestID: requestDetail.requestID
        ? requestDetail.requestID.toIAddress()
        : null,
    },
    response,
    handledIndices: [],
  };
};

export default {
  handleUserDataRequestVDXFObject,
};
