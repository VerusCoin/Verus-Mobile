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

export const responseContainsPlaintextExtendedSpendingKey = response => {
  return (response?.details || []).some(detail => {
    return (
      detail instanceof AppEncryptionResponseOrdinalVDXFObject &&
      detail.data?.containsExtendedSpendingKey?.() === true
    );
  });
};

export const assertNoPlaintextExtendedSpendingKey = response => {
  if (responseContainsPlaintextExtendedSpendingKey(response)) {
    throw new Error(
      'Refusing to deliver an unencrypted extended spending key.',
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
