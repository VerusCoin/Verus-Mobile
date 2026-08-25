import {
  DataDescriptor,
  DataPacketRequestOrdinalVDXFObject,
} from "verus-typescript-primitives";
import createHash from "create-hash";
import { getSignedRequestDisplayProps } from "./requestDisplayUtils";

const sha256Hex = buffer => createHash("sha256").update(buffer).digest("hex");

const getPrintableUtf8 = buffer => {
  if (!buffer || buffer.length === 0) return "";

  const text = buffer.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(buffer)) return null;

  const printableChars = text.replace(/[\t\r\n -~]/g, "");
  return printableChars.length === 0 ? text : null;
};

const getParsedJsonText = text => {
  if (!text) return null;

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch (_) {
    return null;
  }
};

const getSignableObjectSummary = signableObject => {
  if (typeof signableObject === "string") {
    const dataBuffer = Buffer.from(signableObject, "utf8");

    return {
      type: "Message",
      label: signableObject,
      size: dataBuffer.length,
      signedBytesHex: dataBuffer.toString("hex"),
      signedText: signableObject,
      signedJson: getParsedJsonText(signableObject),
      sha256: sha256Hex(dataBuffer),
    };
  }

  if (signableObject instanceof DataDescriptor) {
    const signedBuffer = signableObject.toBuffer();
    const objectDataBuffer = signableObject.objectdata || Buffer.alloc(0);
    const objectDataText = getPrintableUtf8(objectDataBuffer);
    const signedText = getPrintableUtf8(signedBuffer);
    let descriptorJson = null;

    try {
      descriptorJson = JSON.stringify(signableObject.toJson(), null, 2);
    } catch (_) {}

    return {
      type: "Data descriptor",
      label: signableObject.label || signableObject.mimeType || "Data descriptor",
      size: signedBuffer.length,
      descriptorVersion: signableObject.version?.toString?.() || String(signableObject.version),
      descriptorFlags: signableObject.flags?.toString?.() || String(signableObject.flags),
      descriptorLabel: signableObject.label || null,
      descriptorMimeType: signableObject.mimeType || null,
      descriptorJson,
      objectDataBytesHex: objectDataBuffer.toString("hex"),
      objectDataText,
      objectDataJson: getParsedJsonText(objectDataText),
      signedBytesHex: signedBuffer.toString("hex"),
      signedText,
      signedJson: getParsedJsonText(signedText),
      sha256: sha256Hex(signedBuffer),
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
