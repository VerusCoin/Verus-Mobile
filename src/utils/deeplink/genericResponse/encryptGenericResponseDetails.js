import {
  DataDescriptorOrdinalVDXFObject,
  GenericResponse,
} from "verus-typescript-primitives";
import { encryptDataBufferToDescriptor } from "../../crypto/encryptDataDescriptor";

export const encryptGenericResponseDetails = async ({ request, response }) => {
  if (
    request == null ||
    response == null ||
    !request.hasEncryptResponseToAddress() ||
    !response.details ||
    response.details.length === 0 ||
    response.detailsAreEncrypted()
  ) {
    return response;
  }

  const encryptToAddress = request.encryptResponseToAddress.toAddressString();
  if (!encryptToAddress) {
    throw new Error("Request is missing encryptResponseToAddress.");
  }

  const originalHadMultiDetails = response.hasMultiDetails() || response.details.length > 1;
  response.setFlags();
  const detailsBuffer = response.getDetailsBuffer();
  const { encryptedDescriptor } = await encryptDataBufferToDescriptor(
    encryptToAddress,
    detailsBuffer,
  );

  response.details = [
    new DataDescriptorOrdinalVDXFObject({ data: encryptedDescriptor }),
  ];
  response.flags = response.flags.or(GenericResponse.FLAG_DETAILS_ARE_ENCRYPTED);
  if (originalHadMultiDetails) {
    response.flags = response.flags.or(GenericResponse.FLAG_MULTI_DETAILS);
  }
  response.setFlags();

  return response;
};
