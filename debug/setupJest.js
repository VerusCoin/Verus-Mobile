const mockAgamaWalletLibElectrums = require('../__mocks__/agama-wallet-lib/agama-wallet-lib-electrums')
const mockVerusLightClient = require('../__mocks__/react-native-verus-light-client/mock')
const mockRnAlertAsync = require('../__mocks__/react-native-alert-async/mock')
const mockRedux = require('../__mocks__/redux/mock')

jest.mock('agama-wallet-lib/src/electrum-servers', () => mockAgamaWalletLibElectrums());
jest.mock('react-native-verus-light-client', () => mockVerusLightClient());
jest.mock('react-native-alert-async', () => mockRnAlertAsync());
jest.mock('redux', () => mockRedux());

global.fetch = require('../__mocks__/react-native-fetch/fetch')

// App functionality
global.ENABLE_FIAT_GATEWAY = true;
global.ENABLE_VERUS_IDENTITIES = true;
global.ENABLE_DLIGHT = true;

