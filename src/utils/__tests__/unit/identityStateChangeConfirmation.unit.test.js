const mockCreateUpdateIdentityTx = jest.fn();
const mockPushUpdateIdentityTx = jest.fn();
let mockState;

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: {alert: jest.fn()},
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({Button: 'Button', Portal: 'Portal', Text: 'Text'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('react-native-format-currency', () => ({formatCurrency: jest.fn()}));
jest.mock('../../../styles', () => ({highRiskStepStyles: {}, confirmPayStepStyles: {}}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/GradientButton', () => 'GradientButton');
jest.mock('../../../components/SemiModal', () => ({visible, children}) => visible ? children : null);
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {}}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => null}}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  createUpdateIdentityTx: mockCreateUpdateIdentityTx,
  pushUpdateIdentityTx: mockPushUpdateIdentityTx,
}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));
jest.mock('../../crypto/encryptCredentials', () => ({processEncryptedKeys: jest.fn()}));
jest.mock('../../deeplink/genericResponse/ensureGenericResponseSigner', () => ({
  ensureGenericResponseSigner: jest.fn(),
}));
jest.mock('../../vrpc/fundRawTransactionError', () => ({
  showFundRawTransactionErrorAlert: () => false,
}));
jest.mock('../../math', () => ({
  satsToCoins: value => value.dividedBy(1e8),
  truncateDecimal: value => value.toFixed(4),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const BigNumber = require('bignumber.js');
const {Alert} = require('react-native');
const ConfirmPayStep = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ConfirmPayStep').default;
const {buildIdentityStateChange} = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/buildIdentityStateChange');

const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.join('')).join(' ');

it('reviews the funded transaction unlock height before enabling the update', async () => {
  const coinObj = {id: 'VRSC', currency_id: 'currency-id', display_ticker: 'VRSC', seconds_per_block: 60};
  const wallet = {
    id: 'wallet',
    name: 'Test payment wallet',
    network: 'VRSC',
    channel: 'vrpc.payment-address.chain-id',
    api_channels: {get_balances: 'vrpc'},
  };
  mockState = {
    coins: {activeCoinsForUser: [coinObj]},
    coinMenus: {allSubWallets: {VRSC: [wallet]}},
    ledger: {balances: {vrpc: {VRSC: {total: '1'}}}, rates: {}},
    settings: {generalWalletSettings: {displayCurrency: 'USD'}},
  };
  const subjectIdentity = {
    identity: {identityaddress: 'identity-address', flags: 2, timelock: 20},
    blockheight: 90,
  };
  const details = {containsSystem: () => true, systemID: {toAddress: () => 'currency-id'}};
  const preview = buildIdentityStateChange({
    currentIdentity: subjectIdentity.identity,
    updatedIdentity: {flags: 0, timelock: 140},
    chainHeight: 100,
    secondsPerBlock: 60,
  });
  mockCreateUpdateIdentityTx.mockResolvedValue({
    identity: {toJson: () => ({flags: 0, timelock: 160})},
    deltas: new Map([['currency-id', BigNumber(-10000)]]),
    hex: 'funded-transaction',
    utxos: [],
  });

  const renderer = create(
    <ConfirmPayStep
      details={details}
      requestIsTestnet={false}
      subjectIdentity={subjectIdentity}
      subjectIdTxHex="previous-transaction"
      friendlyNames={{'currency-id': 'VRSC'}}
      coinObj={coinObj}
      identityStateChange={preview}
      chainHeight={100}
      highRiskCount={1}
      contentCount={0}
      styles={{}}
    />,
  );
  expect(renderedText(renderer)).toContain('Timelock: 140');
  expect(renderer.root.findByType('GradientButton').props.disabled).toBe(true);

  act(() => renderer.root.findByType('TouchableOpacity').props.onPress());
  const source = renderer.root.findAllByType('TouchableOpacity').find(node =>
    node.findAllByType('Text').some(text => text.children.includes(wallet.name)),
  );
  await act(async () => source.props.onPress());

  expect(mockCreateUpdateIdentityTx).toHaveBeenCalledWith(
    'chain-id', details, 'payment-address', 'previous-transaction', 90, true, undefined, false,
  );
  expect(renderedText(renderer)).toContain('Timelock: 160');
  expect(renderedText(renderer)).toContain('spending from block 161');
  expect(renderedText(renderer)).not.toContain('Timelock: 140');
  expect(renderer.root.findByType('GradientButton').props.disabled).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockPushUpdateIdentityTx).not.toHaveBeenCalled();
  renderer.unmount();
});
