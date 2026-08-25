jest.mock('../../../containers/RootStack/RootStackScreens', () => () => null)
jest.mock('../../../components/Modal', () => () => null)
jest.mock('../../../components/Alert', () => () => null)
jest.mock('../../../components/SendModal/SendModal', () => () => null)
jest.mock('../../../components/LoadingModal/LoadingModal', () => () => null)
jest.mock('../../../actions/actionCreators', () => ({
  fetchUsers: jest.fn(),
  loadServerVersions: jest.fn(),
  loadCachedHeaders: jest.fn(),
  loadEthTxReceipts: jest.fn(),
  initSettings: jest.fn(),
  fetchActiveCoins: jest.fn(),
  requestSeedData: jest.fn(),
  initNotifications: jest.fn(),
  initInstanceKey: jest.fn(),
}))
jest.mock('../../../actions/actionDispatchers', () => ({
  activateKeyboardListener: jest.fn(),
  updateDeeplinkUrl: jest.fn(),
}))
jest.mock('../../CoinData/CoinData', () => ({
  CoinLogos: {VRSC: {light: () => null}},
}))
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    setVrpcOverrides: jest.fn(),
    populateEthereumContractDefinitionsFromStorage: jest.fn(),
    populatePbaasCurrencyDefinitionsFromStorage: jest.fn(),
  },
}))
jest.mock('../../asyncStore/asyncStore', () => ({
  initCache: jest.fn(),
  clearCachedVersions: jest.fn(),
  updateActiveCoinList: jest.fn(),
  checkAndSetVersion: jest.fn(),
  purgeUnusedCoins: jest.fn(),
  clearCachedVrpcResponses: jest.fn(),
}))
jest.mock('../../asyncStore/currencyDefinitionStorage', () => ({
  removeInactiveCurrencyDefinitions: jest.fn(),
}))
jest.mock('../../asyncStore/contractDefinitionStorage', () => ({
  removeInactiveContractDefinitions: jest.fn(),
}))
jest.mock('../../auth/authBox', () => ({initInstance: jest.fn()}))
jest.mock('../../keychain/secureStore', () => ({
  SecureStorage: {initializeWithKeychain: jest.fn()},
}))
jest.mock('../../asyncStore/authDataStorage', () => ({
  recoverPasswordMigration: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}) => children,
}))
jest.mock('react-native-paper', () => ({
  Portal: {Host: ({children}) => children},
}))

import { Alert } from 'react-native'
import { VerusMobile } from '../../../VerusMobile'

describe('startup recovery', () => {
  it('dismisses the splash after a storage initialization failure', async () => {
    const startupError = new Error('storage unavailable')
    const component = new VerusMobile({dispatch: jest.fn()})
    component.setLoading = jest.fn()
    jest.spyOn(Alert, 'alert').mockImplementation(() => {})

    await component.initializeStorage(Promise.reject(startupError))

    expect(Alert.alert).toHaveBeenCalledWith('Error', startupError.message)
    expect(component.setLoading).toHaveBeenCalledWith(false)
  })
})
