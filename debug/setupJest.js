const mockAgamaWalletLibElectrums = require('../__mocks__/agama-wallet-lib/agama-wallet-lib-electrums')
jest.mock('agama-wallet-lib/src/electrum-servers', () => mockAgamaWalletLibElectrums());

global.fetch = require('../__mocks__/react-native-fetch/fetch')
