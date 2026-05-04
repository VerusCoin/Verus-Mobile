import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GenericRequest,
  ProvisionIdentityDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {sha256} from '../crypto/hash';

const STORAGE_KEY = 'provisioning_deeplink_requests';

const loadRawRequests = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const saveRawRequests = requests => {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
};

const normalizeRequest = request => {
  return request && typeof request === 'object' && request.id
    ? {
        ...request,
        completed: request.completed === true,
      }
    : null;
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

export const getProvisioningDeeplinkId = requestBufferString => {
  return sha256(Buffer.from(requestBufferString, 'hex')).toString('hex');
};

export const loadProvisioningDeeplinkRequests = async () => {
  const requests = await loadRawRequests();

  return requests
    .map(normalizeRequest)
    .filter(x => x != null)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

export const saveProvisioningDeeplinkRequest = async ({
  requestBufferString,
  uri = null,
  fromService = null,
  fqnToAutoLink = null,
  requestType = null,
}) => {
  if (!requestBufferString) return null;

  const request = new GenericRequest();
  request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

  const provisioningDetail = request.details.find(
    detail => detail instanceof ProvisionIdentityDetailsOrdinalVDXFObject,
  );

  if (!provisioningDetail) return null;

  const id = getProvisioningDeeplinkId(requestBufferString);
  const requests = await loadProvisioningDeeplinkRequests();
  const existing = requests.find(item => item.id === id);
  const now = Date.now();
  const savedRequest = {
    id,
    requestBufferString,
    uri: uri || existing?.uri || null,
    fromService: fromService != null ? fromService : existing?.fromService || null,
    fqnToAutoLink:
      fqnToAutoLink != null ? fqnToAutoLink : existing?.fqnToAutoLink || null,
    requestType: requestType != null ? requestType : existing?.requestType || null,
    title: getProvisioningTitle(provisioningDetail),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    completed: existing?.completed === true,
    completedAt: existing?.completedAt || null,
  };

  await saveRawRequests([
    savedRequest,
    ...requests.filter(item => item.id !== id),
  ]);

  return savedRequest;
};

export const markProvisioningDeeplinkComplete = async id => {
  if (!id) return;

  const requests = await loadProvisioningDeeplinkRequests();
  const now = Date.now();

  await saveRawRequests(
    requests.map(item =>
      item.id === id
        ? {
            ...item,
            completed: true,
            completedAt: item.completedAt || now,
            updatedAt: now,
          }
        : item,
    ),
  );
};

export const removeProvisioningDeeplinkRequest = async id => {
  if (!id) return;

  const requests = await loadProvisioningDeeplinkRequests();
  await saveRawRequests(requests.filter(item => item.id !== id));
};
