const mockTraditionalCryptoSend = jest.fn();
const mockDispatch = jest.fn();
let mockState;

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  Divider: 'Divider',
  List: {Item: 'ListItem'},
  Text: 'Text',
}));
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: selector => selector(mockState),
}));
jest.mock('../../../actions/actionCreators', () => ({
  expireCoinData: (coin, call) => ({type: 'expire', coin, call}),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  traditionalCryptoSend: mockTraditionalCryptoSend,
}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));
jest.mock('../../math', () => ({truncateDecimal: value => value.toString()}));
jest.mock('../../../styles', () => ({}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Alert} = require('react-native');
const TraditionalCryptoSendConfirm = require('../../../components/SendModal/TraditionalCryptoSend/TraditionalCryptoSendConfirm/TraditionalCryptoSendConfirm').default;

const sendButton = renderer => renderer.root.findAllByType('Button')
  .find(button => button.props.mode === 'contained');

describe.each(['eth', 'erc20'])('%s send confirmation retry protection', channel => {
  let renderer;
  let navigation;

  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      sendModal: {subWallet: {api_channels: {get_balances: channel, get_fiatprice: channel}}},
      ledger: {balances: {[channel]: {coin: {total: '10'}}}, rates: {[channel]: {}}},
      errors: {get_balances: {[channel]: {coin: null}}},
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
    };
    navigation = {navigate: jest.fn()};
    act(() => {
      renderer = create(
        <TraditionalCryptoSendConfirm
          navigation={navigation}
          route={{params: {txConfirmation: {
            coinObj: {id: 'coin', decimals: 18, display_ticker: 'COIN'},
            channel,
            toAddress: 'destination',
            fromAddress: 'sender',
            amountSubmitted: '1',
            finalTxAmount: '1',
            balanceDelta: '-1.01',
            fees: [{amount: '0.01', currency: 'coin'}],
            fullResult: {params: {gasLimit: 21000n, maxFeePerGas: 1000000000n}},
          }}}}
          setLoading={jest.fn()}
          setModalHeight={jest.fn()}
          setPreventExit={jest.fn()}
        />,
      );
    });
  });

  afterEach(() => act(() => renderer.unmount()));

  it('blocks another send after a lost response with uncertain broadcast status', async () => {
    const error = new Error('Your balance changed. The payment may have been sent, but its response was lost.');
    error.ambiguousBroadcast = true;
    mockTraditionalCryptoSend.mockRejectedValue(error);

    await act(async () => sendButton(renderer).props.onPress());

    expect(Alert.alert).toHaveBeenCalledWith('Broadcast status unknown', error.message);
    expect(sendButton(renderer).props.disabled).toBe(true);
    expect(sendButton(renderer).children).toEqual(['Status unknown']);
    expect(navigation.navigate).not.toHaveBeenCalled();

    // Exercise the handler too: the disabled control alone must not be the guard.
    await act(async () => sendButton(renderer).props.onPress());
    expect(mockTraditionalCryptoSend).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a preparation error before broadcasting', async () => {
    mockTraditionalCryptoSend.mockRejectedValue(new Error('Could not read the balance before sending.'));

    await act(async () => sendButton(renderer).props.onPress());

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not read the balance before sending.');
    expect(sendButton(renderer).props.disabled).toBe(false);
    expect(sendButton(renderer).children).toEqual(['Send']);

    await act(async () => sendButton(renderer).props.onPress());
    expect(mockTraditionalCryptoSend).toHaveBeenCalledTimes(2);
  });
});
