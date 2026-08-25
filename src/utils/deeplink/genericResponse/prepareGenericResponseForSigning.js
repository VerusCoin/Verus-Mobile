import {
  BigNumber,
  EHashTypes,
} from "verus-typescript-primitives";

export const prepareGenericResponseForSigning = ({
  request,
  response,
  handledBy,
  createdAtSeconds = (Date.now() / 1000).toFixed(0),
}) => {
  response.requestID = request.requestID;
  response.requestHash = request.getRawDataSha256();
  response.requestHashType = new BigNumber(EHashTypes.HASH_SHA256);
  response.createdAt = new BigNumber(createdAtSeconds);
  response.handledBy = handledBy;
  response.setFlags();
  return response;
};
