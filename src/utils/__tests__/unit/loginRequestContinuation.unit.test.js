let mockState;
const mockDispatch = jest.fn();
const mockOpenAuthenticate = jest.fn();
const mockCloseSendModal = jest.fn();
const mockCreateAlert = jest.fn();
const mockAddCoin = jest.fn();
const mockAddKeypairs = jest.fn();
const mockCoin = {id: 'VRSC', testnet: false, compatible_channels: ['vrpc']};

jest.mock('react-native', () => ({
  Dimensions: {get: () => ({height: 800})},
  SafeAreaView: 'SafeAreaView', ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity', View: 'View',
}));
jest.mock('react-native-paper', () => ({
  Button: 'Button', Divider: 'Divider', Portal: 'Portal', Text: 'Text',
  List: {Item: 'ListItem', Icon: 'ListIcon'},
}));
jest.mock('react-redux', () => ({
  useSelector: selector => selector(mockState), useDispatch: () => mockDispatch,
}));
jest.mock('verusid-ts-client', () => ({
  primitives: {LoginConsentRequest: class {
    constructor(data) { Object.assign(this, data); }
  }},
}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../images/customIcons', () => ({VerusIdLogo: 'VerusIdLogo'}));
jest.mock('../../../components/VerusIdDetailsModal/VerusIdDetailsModal', () => 'VerusIdDetailsModal');
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn()}));
jest.mock('../../math', () => ({unixToDate: () => 'Signed today'}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: () => 'VRSC'}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => mockCoin}}));
jest.mock('../../constants/constants', () => ({SMALL_DEVICE_HEGHT: 600}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({
  openAuthenticateUserModal: mockOpenAuthenticate, closeSendModal: mockCloseSendModal,
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockCreateAlert, resolveAlert: jest.fn(),
}));
jest.mock('../../../actions/actionCreators', () => ({
  addCoin: mockAddCoin, addKeypairs: mockAddKeypairs,
  setUserCoins: activeCoinsForUser => ({type: 'SET_USER_COINS', payload: {activeCoinsForUser}}),
}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  refreshActiveChainLifecycles: jest.fn(),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const LoginRequestInfo = require('../../../containers/DeepLink/LoginRequestInfo/LoginRequestInfo').default;
const {AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST} = require('../../constants/sendModal');

const account = {id: 'profile', accountHash: 'profile-hash', testnetOverrides: {}, keys: {}};
const deeplinkData = {
  system_id: 'system', signing_id: 'signer', challenge: {redirect_uris: ['https://example.test/login']},
};
const navigate = jest.fn();
const props = {deeplinkData, sigtime: 100, signerFqn: 'Requester@', cancel: jest.fn(), navigation: {navigate}};
let renderer;
const render = () => act(() => {
  const element = <LoginRequestInfo {...props} />;
  if (renderer) renderer.update(element);
  else renderer = create(element);
});
const pressContinue = () => renderer.root.findAllByType('Button')
  .find(button => button.props.children === 'Continue').props.onPress();

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAlert.mockResolvedValue(true);
  mockAddKeypairs.mockResolvedValue({type: 'ADD_KEYPAIRS'});
  mockAddCoin.mockResolvedValue({type: 'ADD_COIN', activeCoinList: [mockCoin]});
  mockState = {
    authentication: {accounts: [account], activeAccount: null, signedIn: false, sessionEpoch: 1},
    coins: {activeCoinsForUser: [], activeCoinList: []},
    deeplink: {passthrough: null}, sendModal: {type: null},
  };
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  renderer = null;
});

it('opens authentication once while the selected profile and currencies hydrate before sign-in', () => {
  render();
  act(pressContinue);
  expect(mockOpenAuthenticate).toHaveBeenCalledWith({[SEND_MODAL_USER_ALLOWLIST]: [account]});

  mockState.sendModal.type = AUTHENTICATE_USER_SEND_MODAL;
  mockState.authentication.activeAccount = account;
  render();
  mockState.coins.activeCoinsForUser = [mockCoin];
  render();

  expect(mockOpenAuthenticate).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  expect(mockCloseSendModal).not.toHaveBeenCalled();
});

it('waits for the authentication result to close before continuing exactly once', () => {
  render();
  act(pressContinue);
  mockState.sendModal = {type: AUTHENTICATE_USER_SEND_MODAL, visible: true};
  render();
  // The profile and its coins may finish together while the auth modal is
  // temporarily hidden; its result still owns the flow until the type clears.
  mockState.authentication.activeAccount = account;
  mockState.authentication.signedIn = true;
  mockState.coins.activeCoinsForUser = [mockCoin];
  mockState.sendModal.visible = false;
  render();

  expect(navigate).not.toHaveBeenCalled();
  expect(mockCloseSendModal).not.toHaveBeenCalled();
  mockState.sendModal.type = null;
  render();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('LoginRequestIdentity', {deeplinkData});

  mockState.coins.activeCoinsForUser = [mockCoin, {id: 'BTC'}];
  render();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(mockOpenAuthenticate).toHaveBeenCalledTimes(1);
  expect(mockCloseSendModal).not.toHaveBeenCalled();
});

it('does not continue when authentication closes without signing in', () => {
  mockState.coins.activeCoinsForUser = [mockCoin];
  render();
  act(pressContinue);
  mockState.sendModal.type = AUTHENTICATE_USER_SEND_MODAL;
  render();
  mockState.sendModal.type = null;
  render();
  expect(navigate).not.toHaveBeenCalled();
  expect(mockOpenAuthenticate).toHaveBeenCalledTimes(1);
});

it('continues immediately for an already signed-in profile with the root currency', () => {
  mockState.authentication = {...mockState.authentication, activeAccount: account, signedIn: true};
  mockState.coins.activeCoinsForUser = [mockCoin];
  render();
  expect(navigate).not.toHaveBeenCalled();
  act(pressContinue);
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('LoginRequestIdentity', {deeplinkData});
  expect(mockOpenAuthenticate).not.toHaveBeenCalled();
});

it('continues once after a signed-in user consents to adding the root currency', async () => {
  mockState.authentication = {...mockState.authentication, activeAccount: account, signedIn: true};
  render();
  await act(async () => pressContinue());
  expect(mockCreateAlert).toHaveBeenCalledTimes(1);
  expect(mockAddCoin).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();

  mockState.coins.activeCoinsForUser = [mockCoin];
  render();
  mockState.coins.activeCoinsForUser = [mockCoin, {id: 'BTC'}];
  render();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(mockOpenAuthenticate).not.toHaveBeenCalled();
});

it('does not open authentication for signed-out currency updates without Continue', () => {
  render();
  mockState.coins.activeCoinsForUser = [mockCoin];
  render();
  expect(mockOpenAuthenticate).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});
