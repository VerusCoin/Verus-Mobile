import {
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
} from 'verus-typescript-primitives';

export const EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE =
  'This type of request is currently experimental and disabled in your general wallet settings.';

export const EXPERIMENTAL_GENERIC_REQUEST_DETAIL_KEYS = [
  IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid,
  APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid,
  USER_DATA_REQUEST_VDXF_KEY.vdxfid,
  DATA_PACKET_REQUEST_VDXF_KEY.vdxfid,
];

export const EXPERIMENTAL_DEEPLINK_IDS = [
  IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid,
];

const EXPERIMENTAL_GENERIC_REQUEST_DETAIL_KEY_SET = new Set(
  EXPERIMENTAL_GENERIC_REQUEST_DETAIL_KEYS,
);
const EXPERIMENTAL_DEEPLINK_ID_SET = new Set(EXPERIMENTAL_DEEPLINK_IDS);

export const isExperimentalGenericRequestsEnabled = state =>
  state?.settings?.generalWalletSettings?.enableExperimentalGenericRequests === true;

export const isExperimentalGenericRequestDetailKey = detailKey =>
  EXPERIMENTAL_GENERIC_REQUEST_DETAIL_KEY_SET.has(detailKey);

export const isExperimentalDeeplinkId = deeplinkId =>
  EXPERIMENTAL_DEEPLINK_ID_SET.has(deeplinkId);

export const hasExperimentalGenericRequestDetails = request =>
  Array.isArray(request?.details) &&
  request.details.some(detail =>
    isExperimentalGenericRequestDetailKey(detail.getIAddressKey()),
  );

export const assertExperimentalGenericRequestAllowed = (request, state) => {
  if (
    !isExperimentalGenericRequestsEnabled(state) &&
    hasExperimentalGenericRequestDetails(request)
  ) {
    throw new Error(EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE);
  }
};

export const assertExperimentalDeeplinkAllowed = (deeplinkId, state) => {
  if (
    !isExperimentalGenericRequestsEnabled(state) &&
    isExperimentalDeeplinkId(deeplinkId)
  ) {
    throw new Error(EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE);
  }
};
