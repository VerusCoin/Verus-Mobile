import {
  GenericRequest,
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  ProvisionIdentityDetailsOrdinalVDXFObject,
  SPENDABLE_KEY_DETAILS_VDXF_KEY,
  SpendableKeyDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {DEEPLINK_STORAGE_INTERNAL_KEY} from '../../../env/index';
import {sha256} from '../crypto/hash';
import {SecureStorage} from '../keychain/secureStore';

export const PENDING_REQUEST_KIND_PROVISIONING = PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid;
export const PENDING_REQUEST_KIND_SPENDABLE_KEY = SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid;

const loadRawRequests = async () => {
  const stored = await SecureStorage.getItem(DEEPLINK_STORAGE_INTERNAL_KEY);

  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const saveRawRequests = requests => {
  return SecureStorage.setItem(
    DEEPLINK_STORAGE_INTERNAL_KEY,
    JSON.stringify(requests),
  );
};

const PENDING_REQUEST_WRITE_COORDINATOR_KEY = Symbol.for(
  'verus.mobile.pendingRequestWriteCoordinator.v1',
);
if (globalThis[PENDING_REQUEST_WRITE_COORDINATOR_KEY] == null) {
  globalThis[PENDING_REQUEST_WRITE_COORDINATOR_KEY] = {
    queue: Promise.resolve(),
  };
}
const pendingRequestWriteCoordinator =
  globalThis[PENDING_REQUEST_WRITE_COORDINATOR_KEY];

const queuePendingRequestWrite = operation => {
  const queued = pendingRequestWriteCoordinator.queue.then(
    operation,
    operation,
  );

  pendingRequestWriteCoordinator.queue = queued.catch(() => {});
  return queued;
};

const updatePendingRequests = updater => {
  return queuePendingRequestWrite(async () => {
    const requests = await loadPendingDeeplinkRequests();
    const update = await updater(requests);
    const nextRequests = update?.requests || requests;

    await saveRawRequests(nextRequests);
    return update?.result;
  });
};

const getDisplayAddress = addressObj => {
  if (!addressObj) return null;

  if (typeof addressObj.toAddress === 'function') {
    return addressObj.toAddress();
  }

  if (typeof addressObj.toIAddress === 'function') {
    return addressObj.toIAddress();
  }

  return null;
};

const truncateAddress = address => {
  if (!address || address.length <= 18) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getProvisioningTitle = detail => {
  const identityId = getDisplayAddress(detail.data?.identityID);
  if (identityId) return `Provision ${truncateAddress(identityId)}`;

  const parentId = getDisplayAddress(detail.data?.parentID);
  if (parentId) return `Provision VerusID under ${truncateAddress(parentId)}`;

  return 'VerusID provisioning request';
};

const getSpendableKeyTitle = () => {
  return 'Claim spendable key';
};

const getPendingRequestInfo = request => {
  const provisioningDetail = request.details.find(
    detail => detail instanceof ProvisionIdentityDetailsOrdinalVDXFObject,
  );

  if (provisioningDetail) {
    return {
      requestKind: PENDING_REQUEST_KIND_PROVISIONING,
      title: getProvisioningTitle(provisioningDetail),
    };
  }

  const spendableKeyDetail = request.details.find(
    detail => detail instanceof SpendableKeyDetailsOrdinalVDXFObject,
  );

  if (spendableKeyDetail) {
    return {
      requestKind: PENDING_REQUEST_KIND_SPENDABLE_KEY,
      title: getSpendableKeyTitle(),
    };
  }

  return null;
};

const getPendingRequestInfoFromBuffer = requestBufferString => {
  if (!requestBufferString) return null;

  try {
    const request = new GenericRequest();
    request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
    return getPendingRequestInfo(request);
  } catch (_) {
    return null;
  }
};

const normalizeRequest = request => {
  if (!request || typeof request !== 'object' || !request.id) return null;

  const parsedInfo = getPendingRequestInfoFromBuffer(request.requestBufferString);

  return {
    ...request,
    requestKind: request.requestKind || parsedInfo?.requestKind || null,
    title: request.title || parsedInfo?.title || 'Pending request',
    completed: request.completed === true,
  };
};

export const getPendingDeeplinkId = requestBufferString => {
  return sha256(Buffer.from(requestBufferString, 'hex')).toString('hex');
};

export const loadPendingDeeplinkRequests = async () => {
  const requests = await loadRawRequests();

  return requests
    .map(normalizeRequest)
    .filter(x => x != null)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const getPendingDeeplinkRequestCount = async () => {
  const requests = await loadPendingDeeplinkRequests();

  return requests.filter(request => !request.completed).length;
};

export const getPendingDeeplinkPassthrough = request => {
  if (!request?.id) return null;

  const passthrough = {
    pendingDeeplinkId: request.id,
    pendingRequestKind: request.requestKind || null,
  };

  if (request.requestKind === PENDING_REQUEST_KIND_PROVISIONING) {
    passthrough.pendingProvisioningDeeplinkId = request.id;
  }

  return passthrough;
};

export const savePendingDeeplinkRequest = async ({
  requestBufferString,
  uri = null,
  fromService = null,
  fqnToAutoLink = null,
  requestType = null,
}) => {
  if (!requestBufferString) return null;

  const request = new GenericRequest();
  request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

  const pendingInfo = getPendingRequestInfo(request);

  if (!pendingInfo) return null;

  const id = getPendingDeeplinkId(requestBufferString);
  return updatePendingRequests(async requests => {
    const existing = requests.find(item => item.id === id);
    const now = Date.now();
    const savedRequest = {
      ...existing,
      id,
      requestKind: pendingInfo.requestKind,
      requestBufferString,
      uri: uri || existing?.uri || null,
      fromService: fromService != null ? fromService : existing?.fromService || null,
      fqnToAutoLink:
        fqnToAutoLink != null ? fqnToAutoLink : existing?.fqnToAutoLink || null,
      requestType: requestType != null ? requestType : existing?.requestType || null,
      title: pendingInfo.title,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      completed: existing?.completed === true,
      completedAt: existing?.completedAt || null,
    };

    return {
      requests: [
        savedRequest,
        ...requests.filter(item => item.id !== id),
      ],
      result: savedRequest,
    };
  });
};

export const markPendingDeeplinkComplete = async id => {
  if (!id) return;

  await updatePendingRequests(async requests => {
    const now = Date.now();

    return {
      requests: requests.map(item =>
        item.id === id
          ? {
              ...item,
              completed: true,
              completedAt: item.completedAt || now,
              updatedAt: now,
            }
          : item,
      ),
    };
  });
};

export const removePendingDeeplinkRequest = async id => {
  if (!id) return;

  await updatePendingRequests(async requests => ({
    requests: requests.filter(item => item.id !== id),
  }));
};

export const clearPendingDeeplinkRequests = () => {
  return queuePendingRequestWrite(() =>
    SecureStorage.removeItem(DEEPLINK_STORAGE_INTERNAL_KEY),
  );
};

export const getPendingDeeplinkRequest = async id => {
  if (!id) return null;

  const requests = await loadPendingDeeplinkRequests();
  return requests.find(request => request.id === id) || null;
};

export const setPendingDeeplinkBroadcast = async (id, pendingBroadcast) => {
  if (!id) throw new Error('Cannot save a pending broadcast without a request ID.');

  return updatePendingRequests(async requests => {
    const requestIndex = requests.findIndex(request => request.id === id);

    if (requestIndex === -1) {
      throw new Error('Cannot save a broadcast for an unknown pending request.');
    }

    const now = Date.now();
    const updatedRequest = {
      ...requests[requestIndex],
      pendingBroadcast,
      updatedAt: now,
    };
    const nextRequests = [...requests];

    nextRequests[requestIndex] = updatedRequest;
    return {
      requests: nextRequests,
      result: updatedRequest,
    };
  });
};
