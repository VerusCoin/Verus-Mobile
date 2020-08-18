// Versions
global.APP_VERSION = "0.1.9-beta";
global.VERUS_QR_VERSION = "0.1.1";
global.CHAIN_QR_VERSION = "0.1.0"
global.ELECTRUM_PROTOCOL_CHANGE = 1.4;

// HTTPS
global.REQUEST_TIMEOUT_MS = 10000;

// Cache globals (more in cache files because globals cant be used for
// constants that are needed immediately on app load)
global.BLOCK_HEADER_STORE_CAP = 20;
global.MIN_HEADER_CACHE_CONFS = 100;

// App functionality
global.ENABLE_FIAT_GATEWAY = false;
global.ENABLE_VERUS_IDENTITIES = false;
global.ENABLE_DLIGHT = false;

