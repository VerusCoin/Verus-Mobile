// Testnet environments differ in the Verus API that serves VRSCTEST and in the
// Sepolia contract that bridges it to Ethereum. The active environment is read
// from general wallet settings once at startup, so changing it needs a reload.
// Keep this module free of app imports: CoinDirectory and the web3 layer read it.

import {PRIVATE_TESTNET_VRPC_ENDPOINT} from '../../env/index';

// The private Verus API is not public. A developer build names it in the local
// `env/main.*.json` files as "PRIVATE_TESTNET_VRPC_ENDPOINT". Without that
// value the private environment does not exist.
const privateVrpcEndpoint =
  typeof PRIVATE_TESTNET_VRPC_ENDPOINT === 'string'
    ? PRIVATE_TESTNET_VRPC_ENDPOINT.trim()
    : '';

export const hasPrivateTestnetEnvironment = () => privateVrpcEndpoint.length > 0;

export const TESTNET_ENVIRONMENT_PUBLIC = 'public';
export const TESTNET_ENVIRONMENT_PRIVATE = 'private';

// Bridge delegator addresses are the `nativecurrencyid` of vETH on each chain.
// Keep them lowercase: the daemon returns lowercase and the app compares them.
export const TESTNET_ENVIRONMENTS = {
  [TESTNET_ENVIRONMENT_PUBLIC]: {
    vrpcEndpoints: null, // null keeps the default VRSCTEST endpoints
    disableDlight: false,
    explorerUrl: 'https://testex.verus.io',
    bridgeDelegator: '0xcaa98a4ec79dac8a06cb3bfdcf5351b6576d939f',
  },
  [TESTNET_ENVIRONMENT_PRIVATE]: {
    vrpcEndpoints: [privateVrpcEndpoint],
    disableDlight: true,
    explorerUrl: null, // Private-chain transactions have no public explorer.
    bridgeDelegator: '0x98f58684b05e7d40719e61955015af91ef7e77d3',
  },
};

let activeEnvironment = TESTNET_ENVIRONMENT_PUBLIC;

// A stored private choice without an endpoint falls back to public. It must
// not pair the private bridge contract with the public Verus API.
export const normalizeTestnetEnvironment = environment =>
  environment === TESTNET_ENVIRONMENT_PRIVATE && hasPrivateTestnetEnvironment()
    ? TESTNET_ENVIRONMENT_PRIVATE
    : TESTNET_ENVIRONMENT_PUBLIC;

export const setTestnetEnvironment = environment => {
  activeEnvironment = normalizeTestnetEnvironment(environment);
};

export const getTestnetEnvironment = () => activeEnvironment;

export const getTestnetBridgeDelegator = () =>
  TESTNET_ENVIRONMENTS[activeEnvironment].bridgeDelegator;

export const getTestnetExplorer = () =>
  TESTNET_ENVIRONMENTS[activeEnvironment].explorerUrl;

// Endpoint overrides keyed by system ID, in the shape of the user's
// `vrpcOverrides` setting. They take precedence over the user's.
export const getTestnetVrpcOverrides = testnetSystemId => {
  const {vrpcEndpoints} = TESTNET_ENVIRONMENTS[activeEnvironment];

  return vrpcEndpoints ? {[testnetSystemId]: [...vrpcEndpoints]} : {};
};

export const shouldDisableTestnetDlight = () =>
  TESTNET_ENVIRONMENTS[activeEnvironment].disableDlight;
