export const REGISTRATION_CHAIN_CONTEXT_MESSAGE = 'The network changed while checking. Try again.';

export const isRegistrationChainContextError = error =>
  error?.code === 'INVALID_CHAIN_CONTEXT' || error?.code === 'STALE_CHAIN_CONTEXT';

// Only pass unsigned SDK reads/builds here. Never retry signing, broadcast,
// persistence or a saved-transaction resend through this helper.
export const withRegistrationChainContextRetry = async read => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (attempt === 2 || !isRegistrationChainContextError(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
};
