import {CONNECTION_FAILED_MESSAGE, isConnectionErrorMessage} from '../../../../utils/network/connectionErrors';
import {verusIdCopy} from '../../../../utils/verusid/verusIdCopy';
import {validateIdentityRegistrationName} from 'verus-typescript-primitives';
import {isRegistrationChainContextError, REGISTRATION_CHAIN_CONTEXT_MESSAGE} from '../../../../utils/identityRegistration/chainContext';

const nameValidationMessage = message => {
  if (/name.*(?:1 to 64|1–64)/i.test(message)) return 'Use a shorter name.';
  if (/name.*(?:invalid UTF-8|invalid characters|separators)/i.test(message))
    return 'Use letters, numbers, or single spaces.';
  if (/name.*(?:leading, trailing, or repeated spaces)/i.test(message))
    return 'Use single spaces between words.';
  return null;
};

// The namespace is a separate control. Validate the typed leaf before lookup.
export const registrationNameError = name => {
  if (!name) return null;
  let message;
  if (name.includes('.')) message = 'Names cannot contain a dot.';
  else if (name.includes('@')) message = 'Enter the name without @.';
  else {
    try { validateIdentityRegistrationName(name); return null; }
    catch (error) { message = nameValidationMessage(error.message) || 'Choose another name.'; }
  }
  return {code: 'INVALID_NAME', message, retryable: false};
};

export const registrationNameCheckError = error => {
  if (isRegistrationChainContextError(error))
    return {code: error.code, retryable: true, message: REGISTRATION_CHAIN_CONTEXT_MESSAGE};
  const validation = nameValidationMessage(String(error?.message || ''));
  if (validation) return {code: 'INVALID_NAME', message: validation, retryable: false};
  const retryable = isVerusIdTransportError(error) || !error?.code || typeof error.code === 'number' ||
    ['RPC_ERROR', 'INVALID_RPC_RESPONSE',
      'REFERRAL_HISTORY_UNAVAILABLE', 'WRONG_REGISTRATION_SYSTEM'].includes(error.code);
  return {code: error?.code, retryable, message: retryable
    ? 'Could not check this name.' : 'Choose another name or namespace.'};
};

// Keep domain/safety errors intact. Only transport codes or transport text
// reach the existing Send/Convert connection copy, including RPC-prefixed text.
const TRANSPORT_CODES = ['ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST'];
export const isVerusIdTransportError = error => {
  if (error?.transport === true) return true;
  // The SDK wraps every RPC failure as RPC_ERROR and keeps the client error in
  // details, such as {code: -32603, message: 'Network Error'}. Judge that one.
  if (error?.code === 'RPC_ERROR' && error.details) return isVerusIdTransportError(error.details);
  if (typeof error?.code === 'string' && !TRANSPORT_CODES.includes(error.code)) return false;
  const message = String(error?.message || error || '');
  return TRANSPORT_CODES.includes(error?.code) || isConnectionErrorMessage(message) ||
    /\brequest failed with status code [45]\d\d\b/i.test(message) ||
    /(?:^|:\s*)(?:no response(?: received)?(?: from (?:the )?(?:server|network))?|request timeout|timeout)[.!]?$/i.test(message.trim());
};

export const verusIdErrorMessage = error => isRegistrationChainContextError(error)
  ? REGISTRATION_CHAIN_CONTEXT_MESSAGE : isVerusIdTransportError(error)
    ? CONNECTION_FAILED_MESSAGE : verusIdCopy(String(error?.message || error || ''));

export const verusIdUiError = (error, fallback) => ({
  code: error?.code,
  transport: isVerusIdTransportError(error),
  message: verusIdErrorMessage(error?.message ? error : {...error, message: fallback}),
});
