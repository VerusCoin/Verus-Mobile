import {
  CompactAddressObject,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';

export const getGenericResponseSigner = response => {
  if (response?.signature == null) return null;

  try {
    return {
      systemID: response.signature.systemID.toIAddress(),
      identityID: response.signature.identityID.toIAddress(),
    };
  } catch (_) {
    throw new Error('Generic response contains an invalid signer.');
  }
};

export const ensureGenericResponseSigner = ({
  response,
  systemID,
  identityID,
}) => {
  if (response == null) {
    throw new Error('Missing generic response.');
  }

  if (!systemID || !identityID) {
    throw new Error('A response system and identity are required.');
  }

  const currentSigner = getGenericResponseSigner(response);

  if (currentSigner == null) {
    response.signature = new VerifiableSignatureData({
      systemID: CompactAddressObject.fromIAddress(systemID),
      identityID: CompactAddressObject.fromIAddress(identityID),
    });
    response.setSigned();
    return response;
  }

  if (
    currentSigner.systemID !== systemID ||
    currentSigner.identityID !== identityID
  ) {
    throw new Error(
      `This response is already locked to ${currentSigner.identityID}. ` +
        'All details in one response must use the same identity.',
    );
  }

  return response;
};
