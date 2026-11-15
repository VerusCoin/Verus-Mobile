import VrpcProvider from '../../../../vrpc/vrpcInterface';

// These APIs only read public chain data or build locally. Wallet RPCs such as
// registernamecommitment/registeridentity must never be called by Mobile.
export const registrationRpcResult = (response, label) => {
  if (response?.error != null) {
    const message = response.error.message || `${label} failed.`;
    const error = new Error(/^Identity parameter must be (?:a )?valid friendly name or (?:identity address|i-address)\b/i.test(message)
      ? 'Enter an identity address or an identity name ending in @, such as friend@.'
      : message);
    error.code = response.error.code;
    throw error;
  }
  if (!response || !Object.prototype.hasOwnProperty.call(response, 'result')) {
    throw new Error(`${label} returned an invalid response.`);
  }
  return response.result;
};

export const getIdentityRegistrationFunding = async (systemId, fundingAddress) => {
  const result = registrationRpcResult(
    await VrpcProvider.getEndpoint(systemId).getAddressUtxos({addresses: [fundingAddress]}),
    'Get registration funding',
  );
  if (!Array.isArray(result)) throw new Error('Invalid registration funding response.');
  const seen = new Set();
  // Older daemon versions encode this flag as 1/0. It describes output type,
  // not local key ownership; the SDK verifies the actual signing requirements.
  return result.filter(input => (input.isspendable === true || input.isspendable === 1) && (
    input.satoshis !== 0 || Object.keys(input.currencyvalues || {}).length > 0
  )).map(input => {
    const vout = input.outputIndex == null ? input.vout : input.outputIndex;
    if (!/^[0-9a-f]{64}$/i.test(input.txid) || !Number.isSafeInteger(vout) || vout < 0 || vout > 0xffffffff) {
      throw new Error('Invalid registration funding outpoint.');
    }
    const key = `${input.txid}:${vout}`;
    if (seen.has(key)) throw new Error('Duplicate registration funding outpoint.');
    seen.add(key);
    // Values and scripts are deliberately not accepted from the address index.
    // The SDK verifies every source transaction and its active unspent state.
    return {txid: input.txid, vout};
  });
};
