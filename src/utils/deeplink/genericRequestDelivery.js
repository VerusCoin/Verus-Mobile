import axios from 'axios';
import base64url from 'base64url';
import {Linking} from 'react-native';
import {URL} from 'react-native-url-polyfill';
import {
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  GENERIC_RESPONSE_DEEPLINK_VDXF_KEY,
  GenericRequest,
  GenericResponse,
  ResponseURI,
  VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID,
} from 'verus-typescript-primitives';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import store from '../../store';
import {getAppEncryptionSessionKey} from './appEncryptionSession';
import {signGenericResponse} from '../api/channels/vrpc/callCreators';
import {verifyGenericResponse} from '../api/channels/vrpc/requests/verifyGenericResponse';
import {encryptGenericResponseDetails} from './genericResponse/encryptGenericResponseDetails';
import {prepareGenericResponseForSigning} from './genericResponse/prepareGenericResponseForSigning';
import {
  assertNoPlaintextAppEncryptionResponse,
  assertSecurePostResponseUri,
} from './genericResponse/responseDeliverySecurity';
import {
  assertAuthenticationRequestsNotExpired,
  performAfterAuthenticationExpiryCheck,
  signAfterAuthenticationExpiryCheck,
} from './validator/authenticationRequestValidator';
import {createRequestSessionGuard} from './requestSessionGuard';

export const GENERIC_REQUEST_DELIVERY_TYPES = {
  NONE: 'none',
  POST: 'post',
  REDIRECT: 'redirect',
};

// Security checks reject locally before POST. Transport failures retain a cause.
export const isLocalResponsePostRejection = error =>
  error?.isResponsePostError === true && error.cause == null;

export const getGenericResponseDeliveryFailure = error => {
  if (isLocalResponsePostRejection(error))
    return {canRetry: false, message: error.message};
  if (error?.code === 'AUTHENTICATION_REQUEST_EXPIRED')
    return {
      canRetry: false,
      message: 'This request expired. Ask the requester for a new request.',
    };
  if (error?.code === 'SESSION_CHANGED')
    return {
      canRetry: false,
      message:
        'Your wallet session changed. Open the request again to review it.',
    };
  if (error?.code === 'RESPONSE_VERIFICATION_FAILED')
    return {
      canRetry: false,
      message:
        'The response signature could not be verified. Check your VerusID, then open the request again.',
    };
  return {
    canRetry: true,
    message:
      'Unable to prepare or deliver the response. Check your connection and try again.',
  };
};

export const isPostUri = uri => {
  if (uri == null || uri.type == null) return false;
  if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_POST);
  return Number(uri.type) === ResponseURI.TYPE_POST.toNumber();
};

export const isRedirectUri = uri => {
  if (uri == null || uri.type == null) return false;
  if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_REDIRECT);
  return Number(uri.type) === ResponseURI.TYPE_REDIRECT.toNumber();
};

export const getResponseUri = responseUris => {
  if (responseUris == null || responseUris.length === 0) return null;

  const postUri = responseUris.find(uri => isPostUri(uri));
  if (postUri) return postUri;

  const redirectUri = responseUris.find(uri => isRedirectUri(uri));
  return redirectUri || null;
};

export const getUriDestinationHost = uriString => {
  if (!uriString) return null;

  try {
    const url = new URL(uriString);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return uriString;
  }
};

// The review label for how the response travels. Plain HTTP POSTs are a
// development aid (responseDeliverySecurity.js), so they are never "secure".
export const getGenericRequestDeliveryLabel = deliveryInfo => {
  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
    return /^https:\/\//i.test(deliveryInfo.uriString || '')
      ? 'Secure POST'
      : 'POST over HTTP';
  }

  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT) {
    return 'Redirect';
  }

  return null;
};

export const getGenericRequestDeliveryInfo = request => {
  const responseUri = getResponseUri(request?.responseURIs || []);

  if (responseUri == null) {
    return {
      type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
      responseUri: null,
      uriString: null,
      destinationHost: null,
    };
  }

  const uriString = responseUri.getUriString();
  const destinationHost = getUriDestinationHost(uriString);

  return {
    type: isPostUri(responseUri)
      ? GENERIC_REQUEST_DELIVERY_TYPES.POST
      : GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT,
    responseUri,
    uriString,
    destinationHost,
  };
};

export const parseGenericRequestBuffer = requestBufferString => {
  if (!requestBufferString) return null;

  const request = new GenericRequest();
  request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
  return request;
};

export const parseGenericResponseBuffer = responseBufferString => {
  if (!responseBufferString) return null;

  const response = new GenericResponse();
  response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
  return response;
};

export const signAndVerifyGenericResponse = async (
  request,
  response,
  sessionGuard = createRequestSessionGuard(),
) => {
  const assertCurrent = () => {
    sessionGuard.assertCurrent();
    assertAuthenticationRequestsNotExpired(request);
  };
  assertCurrent();
  await encryptGenericResponseDetails({request, response});
  assertCurrent();
  prepareGenericResponseForSigning({
    request,
    response,
    handledBy: VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID,
  });

  if (response.signature == null) {
    return null;
  }

  const signerSystemID = response.signature.systemID.toIAddress();
  const coinObj = CoinDirectory.getBasicCoinObj(signerSystemID);
  const signedResponse = await signAfterAuthenticationExpiryCheck(request, () => {
    assertCurrent();
    return signGenericResponse(coinObj, response, {
      request,
      sessionScope: sessionGuard.sessionScope,
      assertActive: assertCurrent,
      assertCurrent,
    });
  });
  assertCurrent();
  const verification = await verifyGenericResponse(coinObj, signedResponse);
  assertCurrent();

  if (!verification) {
    const error = new Error(
      'Response failed verification, ensure the identity you selected is still under your control.',
    );
    error.code = 'RESPONSE_VERIFICATION_FAILED';
    throw error;
  }

  return signedResponse;
};

export const deliverGenericResponse = async (request, signedResponse) => {
  const deliveryInfo = getGenericRequestDeliveryInfo(request);

  if (
    deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.NONE ||
    signedResponse == null
  ) {
    return {
      ...deliveryInfo,
      type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
      reason: signedResponse == null ? 'no-response' : 'no-destination',
      signedResponse,
    };
  }

  assertNoPlaintextAppEncryptionResponse(signedResponse);

  if (deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
    const responseBuffer = signedResponse.toBuffer();
    const secureResponseUri = assertSecurePostResponseUri(
      deliveryInfo.uriString,
    );

    try {
      const postResult = await axios.post(secureResponseUri, responseBuffer, {
        headers: {'Content-Type': 'application/octet-stream'},
      });

      return {
        ...deliveryInfo,
        postResult,
        signedResponse,
      };
    } catch (error) {
      const status = error?.response?.status;
      const statusSuffix = status != null ? ` (HTTP ${status})` : '';
      const postError = new Error(
        `Failed to send the response to the requester${statusSuffix}.`,
      );

      postError.isResponsePostError = true;
      postError.deliveryInfo = deliveryInfo;
      postError.postStatus = status;
      postError.cause = error;
      throw postError;
    }
  }

  const url = new URL(deliveryInfo.uriString);
  url.searchParams.set(
    GENERIC_RESPONSE_DEEPLINK_VDXF_KEY.vdxfid,
    base64url(signedResponse.toBuffer()),
  );

  const redirectUrl = url.toString();

  try {
    await Linking.openURL(redirectUrl);
  } catch (error) {
    const redirectError = new Error(
      error?.message || 'Failed to open the requester redirect.',
    );

    redirectError.isResponseRedirectError = true;
    redirectError.deliveryInfo = deliveryInfo;
    redirectError.cause = error;
    throw redirectError;
  }

  return {
    ...deliveryInfo,
    redirectUrl,
    signedResponse,
  };
};

// A flow owns one in-memory attempt. Delivery retries reuse the exact signed,
// encrypted response; a changed request or response invalidates that preparation.
// The caller owns the single-flight guard and discards this closure on exit.
export const createGenericResponseDelivery = () => {
  let prepared = null;
  let attempt = null;
  let appEncryptionSessionKey;
  return async ({
    requestBufferString,
    responseBufferString,
    onPhase,
    assertCurrent = () => {},
  }) => {
    assertCurrent();
    if (
      !attempt ||
      attempt.requestBufferString !== requestBufferString ||
      attempt.responseBufferString !== responseBufferString
    ) {
      prepared = null;
      attempt = {
        requestBufferString,
        responseBufferString,
        sessionGuard: createRequestSessionGuard(assertCurrent),
      };
    }
    if (appEncryptionSessionKey === undefined) {
      const request = parseGenericRequestBuffer(requestBufferString);
      appEncryptionSessionKey = request?.details.some(detail =>
        detail.getIAddressKey() === APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid,
      ) ? getAppEncryptionSessionKey(store.getState()) : null;
    }
    const assertActive = () => {
      assertCurrent();
      if (appEncryptionSessionKey != null &&
          appEncryptionSessionKey !== getAppEncryptionSessionKey(store.getState())) {
        throw Object.assign(new Error('Encryption approval is no longer current.'), {code: 'SESSION_CHANGED'});
      }
    };
    const sessionGuard = createRequestSessionGuard(assertActive, attempt.sessionGuard.sessionScope);
    sessionGuard.assertCurrent();

    if (!prepared) {
      onPhase?.('preparing');
      const request = parseGenericRequestBuffer(requestBufferString);
      const response = parseGenericResponseBuffer(responseBufferString);
      const signedResponse =
        request && response
          ? await signAndVerifyGenericResponse(request, response, sessionGuard)
          : null;
      sessionGuard.assertCurrent();
      prepared = {
        requestBufferString,
        responseBufferString,
        request,
        signedResponse,
      };
    }

    if (!prepared.request || !prepared.signedResponse) {
      return {
        type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
        reason: 'no-response',
        responseUri: null,
        uriString: null,
        destinationHost: null,
        signedResponse: null,
      };
    }

    onPhase?.('sending');
    return performAfterAuthenticationExpiryCheck(prepared.request, () => {
      sessionGuard.assertCurrent();
      return deliverGenericResponse(prepared.request, prepared.signedResponse);
    });
  };
};

export const completeGenericResponseDelivery = args =>
  createGenericResponseDelivery()(args);
