import {
  DATA_TYPE_OBJECT_CREDENTIAL,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  VdxfUniValue,
} from "verus-typescript-primitives";

export const buildUserDataResponse = ({ userDataDetail, credentials }) => {
  if (!credentials || credentials.length === 0) {
    return null;
  }

  const dataDescriptor = new DataDescriptor({
    version: DataDescriptor.DEFAULT_VERSION,
    objectdata: new VdxfUniValue({
      values: credentials.map(credential => ({
        [DATA_TYPE_OBJECT_CREDENTIAL.vdxfid]: credential,
      })),
    }).toBuffer(),
  });

  return new DataResponseOrdinalVDXFObject({
    data: new DataResponseDetails({
      requestID: userDataDetail.requestID,
      data: dataDescriptor,
    }),
  });
};
