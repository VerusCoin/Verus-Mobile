import {
  AppEncryptionResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {URL} from 'react-native-url-polyfill';

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

export const assertSecurePostResponseUri = uriString => {
  let url;

  try {
    url = new URL(uriString);
  } catch (_) {
    throw new Error('Requester supplied an invalid response URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Response POST URLs must use HTTPS.');
  }

  return url.toString();
};
