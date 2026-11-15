import {
  AppEncryptionResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {URL} from 'react-native-url-polyfill';
import {ALLOW_HTTP_GENERIC_RESPONSE_POSTS} from '../../../../env/index';

const responsePostUriError = message => {
  const error = new Error(message);
  error.isResponsePostError = true;
  return error;
};

export const responseContainsPlaintextAppEncryptionResponse = response => {
  return (response?.details || []).some(
    detail => detail instanceof AppEncryptionResponseOrdinalVDXFObject,
  );
};

export const assertNoPlaintextAppEncryptionResponse = response => {
  // Viewing keys also grant channel access and must never be delivered in plaintext.
  if (responseContainsPlaintextAppEncryptionResponse(response)) {
    throw new Error(
      'Refusing to deliver an unencrypted app encryption response.',
    );
  }
};

export const assertSecurePostResponseUri = (
  uriString,
  allowHttp = ALLOW_HTTP_GENERIC_RESPONSE_POSTS,
) => {
  let url;

  try {
    url = new URL(uriString);
  } catch (_) {
    throw responsePostUriError(
      'Requester supplied an invalid response URL.',
    );
  }

  const protocolAllowed =
    url.protocol === 'https:' ||
    (allowHttp === true && url.protocol === 'http:');

  if (!protocolAllowed) {
    throw responsePostUriError('Response POST URLs must use HTTPS.');
  }

  return url.toString();
};
