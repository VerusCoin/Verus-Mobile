import {sha256} from '@noble/hashes/sha256';
import {primitives} from 'verusid-ts-client';
import {GenericRequest} from 'verus-typescript-primitives';
import {
  NOTIFICATION_TYPE_VERUSID_ERROR,
  NOTIFICATION_TYPE_VERUSID_FAILED,
  NOTIFICATION_TYPE_VERUSID_PENDING,
  NOTIFICATION_TYPE_VERUSID_READY,
} from '../constants/services';
import {convertFqnToDisplayFormat} from '../fullyqualifiedname';

export const PROVISIONING_REQUEST_STATUSES = {
  REQUESTABLE: 'requestable',
  PENDING: 'pending',
  READY: 'ready',
  LINKED: 'linked',
  FAILED: 'failed',
};

export const PROVISIONING_REQUEST_ALREADY_USED_TITLE =
  'VerusID already requested';
export const PROVISIONING_REQUEST_ALREADY_USED_MESSAGE =
  'This sign-in request has already been used to request a VerusID. Check the VerusID options for the next step.';

const getAddressValue = address => {
  if (address == null) return null;
  if (typeof address === 'string') return address;
  if (typeof address.toAddress === 'function') return address.toAddress();
  if (typeof address.toIAddress === 'function') return address.toIAddress();
  return null;
};

const normalizeRequestKey = value =>
  value == null || value === '' ? null : String(value);

const fingerprintRequest = bufferString => bufferString
  ? Buffer.from(sha256(Buffer.from(bufferString, 'hex'))).toString('hex')
  : null;

const getGenericRequestKey = (request, fallbackBufferString = null) => {
  const requestId = getAddressValue(request?.requestID);
  return normalizeRequestKey(requestId) || fingerprintRequest(fallbackBufferString);
};

export const getGenericProvisioningRequestKey = ({
  request,
  requestBufferString = null,
}) => {
  if (request) {
    try {
      return getGenericRequestKey(request, requestBufferString);
    } catch (e) {
      // Fall through to parsing the serialized request below.
    }
  }

  if (!requestBufferString) return null;

  try {
    const parsedRequest = new GenericRequest();
    parsedRequest.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return getGenericRequestKey(parsedRequest, requestBufferString);
  } catch (e) {
    return fingerprintRequest(requestBufferString);
  }
};

export const getLoginConsentProvisioningRequestKey = request => {
  const challengeId = request?.challenge?.challenge_id;
  return normalizeRequestKey(challengeId);
};

export const getStoredProvisioningRequestKey = provisioningDetails => {
  if (!provisioningDetails) return null;
  if (provisioningDetails.requestKey) {
    return normalizeRequestKey(provisioningDetails.requestKey);
  }

  const requestType = provisioningDetails.requestType || 'loginconsent';
  const requestPayload = provisioningDetails.loginRequest;

  if (!requestPayload) return null;

  if (requestType === 'generic') {
    return getGenericProvisioningRequestKey({
      requestBufferString: requestPayload,
    });
  }

  try {
    const loginConsentRequest = new primitives.LoginConsentRequest();
    loginConsentRequest.fromBuffer(Buffer.from(requestPayload, 'base64'));
    return getLoginConsentProvisioningRequestKey(loginConsentRequest);
  } catch (e) {
    return null;
  }
};

const getDisplayName = (entry, identityAddress) => {
  if (entry?.fqn) {
    return convertFqnToDisplayFormat(entry.fqn);
  }

  return identityAddress || 'VerusID';
};

const getMappedStatus = rawStatus => {
  switch (rawStatus) {
    case NOTIFICATION_TYPE_VERUSID_READY:
      return PROVISIONING_REQUEST_STATUSES.READY;
    case NOTIFICATION_TYPE_VERUSID_FAILED:
      return PROVISIONING_REQUEST_STATUSES.FAILED;
    case NOTIFICATION_TYPE_VERUSID_ERROR:
    case NOTIFICATION_TYPE_VERUSID_PENDING:
    default:
      return PROVISIONING_REQUEST_STATUSES.PENDING;
  }
};

export const getProvisioningRequestState = ({
  completedProvisioningRequests = {},
  requestKey,
  pendingIds,
  linkedIds = {},
}) => {
  if (!requestKey) {
    return {
      status: PROVISIONING_REQUEST_STATUSES.REQUESTABLE,
      requestKey: null,
    };
  }

  const normalizedRequestKey = normalizeRequestKey(requestKey);

  for (const chainId of Object.keys(pendingIds || {})) {
    const chainPendingIds = pendingIds[chainId] || {};

    for (const identityAddress of Object.keys(chainPendingIds)) {
      const entry = chainPendingIds[identityAddress];
      const storedRequestKey = getStoredProvisioningRequestKey(entry);

      if (storedRequestKey !== normalizedRequestKey) continue;

      if (linkedIds?.[chainId]?.[identityAddress]) {
        return {
          chainId,
          displayName: linkedIds[chainId][identityAddress],
          iAddress: identityAddress,
          requestKey: normalizedRequestKey,
          rawStatus: entry?.status,
          status: PROVISIONING_REQUEST_STATUSES.LINKED,
          storedEntry: entry,
        };
      }

      return {
        chainId,
        displayName: getDisplayName(entry, identityAddress),
        iAddress: identityAddress,
        requestKey: normalizedRequestKey,
        rawStatus: entry?.status,
        status: getMappedStatus(entry?.status),
        storedEntry: entry,
      };
    }
  }

  const completedEntry = completedProvisioningRequests?.[normalizedRequestKey];

  if (completedEntry) {
    const chainId = completedEntry.chainId;
    const identityAddress = completedEntry.iAddress;
    const linkedDisplayName =
      chainId && identityAddress ? linkedIds?.[chainId]?.[identityAddress] : null;

    return {
      chainId,
      displayName:
        linkedDisplayName || getDisplayName(completedEntry, identityAddress),
      iAddress: identityAddress,
      requestKey: normalizedRequestKey,
      status: PROVISIONING_REQUEST_STATUSES.LINKED,
      storedEntry: completedEntry,
    };
  }

  return {
    status: PROVISIONING_REQUEST_STATUSES.REQUESTABLE,
    requestKey: normalizedRequestKey,
  };
};

export const shouldBlockProvisioningRequest = provisioningRequestState => {
  if (!provisioningRequestState) return false;

  return ![
    PROVISIONING_REQUEST_STATUSES.REQUESTABLE,
    PROVISIONING_REQUEST_STATUSES.FAILED,
  ].includes(provisioningRequestState.status);
};

export const isProvisioningResponseMismatchError = error => {
  const message = error?.message || '';

  return (
    message.includes('does not match requested identity address') ||
    message.includes('does not match requested fully qualified name')
  );
};
