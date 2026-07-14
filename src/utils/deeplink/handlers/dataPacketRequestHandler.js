import {
  DataDescriptor,
  DataPacketRequestOrdinalVDXFObject,
} from "verus-typescript-primitives";
import { getSignedRequestDisplayProps } from "./requestDisplayUtils";

const getSignableObjectSummary = signableObject => {
  if (typeof signableObject === "string") {
    return {
      type: "Message",
      label: signableObject,
      size: Buffer.byteLength(signableObject, "utf8"),
    };
  }

  if (signableObject instanceof DataDescriptor) {
    return {
      type: "Data descriptor",
      label: signableObject.label || signableObject.mimeType || "Data descriptor",
      size: signableObject.objectdata ? signableObject.objectdata.length : 0,
    };
  }

  return {
    type: "Unsupported",
    label: "Unsupported data",
    size: 0,
  };
};

export const handleDataPacketRequestVDXFObject = async (request, response, detailIndex) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof DataPacketRequestOrdinalVDXFObject)) {
    throw new Error("Invalid DataPacketRequest detail at index " + detailIndex);
  }

  const requestDetail = detail.data;
  const displayProps = await getSignedRequestDisplayProps(request);

  return {
    displayProps: {
      ...displayProps,
      detailsBufferString: requestDetail.toBuffer().toString("hex"),
      statements: requestDetail.statements || [],
      signableObjectSummaries: requestDetail.signableObjects.map(getSignableObjectSummary),
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
  handleDataPacketRequestVDXFObject,
};
