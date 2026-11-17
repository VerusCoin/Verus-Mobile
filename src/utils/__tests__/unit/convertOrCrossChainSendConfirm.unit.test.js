const mockSendConvertOrCrossChain = jest.fn();
const mockCreateAlert = jest.fn();
const mockDispatch = jest.fn();
let mockState;

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  Button: 'Button', Divider: 'Divider', Text: 'Text',
  List: {Item: 'ListItem', Accordion: 'ListAccordion', Icon: 'ListIcon'},
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => ({useDispatch: () => mockDispatch}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../../actions/actionCreators', () => ({
  expireCoinData: (coin, call) => ({type: 'expire', coin, call}),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockCreateAlert,
}));
jest.mock('../../api/routers/sendConvertOrCrossChain', () => ({
  sendConvertOrCrossChain: mockSendConvertOrCrossChain,
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getBasicCoinObj: () => ({display_ticker: 'ETH'})},
}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));
jest.mock('../../math', () => ({
  coinsToSats: value => value.times(1e8),
  satsToCoins: value => value.dividedBy(1e8),
  truncateDecimal: value => value.toString(),
}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'AnimatedActivityIndicatorBox');
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoicePaymentReview', () => 'InvoicePaymentReview');

const React = require('react');
const BigNumber = require('bignumber.js');
const {act, create} = require('react-test-renderer');
const {Alert} = require('react-native');
const Confirm = require('../../../components/SendModal/ConvertOrCrossChainSend/ConvertOrCrossChainSendConfirm/ConvertOrCrossChainSendConfirm').default;
const {SEND_MODAL_FORM_STEP_RESULT} = require('../../constants/sendModal');

const sendButton = renderer => renderer.root.findAllByType('Button')
  .find(button => button.props.mode === 'contained');

const makePreflight = channel => ({
  source: 'sender',
  output: {
    currency: 'coin', satoshis: '10000000',
    address: {getAddressString: () => 'destination'},
    burn: channel === 'vrpc',
  },
  validation: {valid: true, sent: {coin: '10000000'}, fees: {coin: '10000'}, change: {}},
  names: new Map([['coin', 'COIN']]),
  deltas: new Map([['coin', new BigNumber(-10010000)]]),
});

describe.each(['eth', 'erc20', 'vrpc'])('%s conversion confirmation retry protection', channel => {
  let renderer;
  let navigation;
  let setLoading;
  let setPreventExit;
  let preflight;
  const buttonLabel = channel === 'vrpc' ? 'Burn' : 'Send';
  const notSentTitle = channel === 'vrpc' ? 'Burn not sent' : 'Payment not sent';
  const notSentMessage = `The ${
    channel === 'vrpc' ? 'burn' : 'payment'
  } was not sent. Check your connection and try again.`;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockState = {
      authentication: {activeAccount: {id: 'fixture'}},
      sendModal: {
        coinObj: {id: 'coin', proto: channel},
        subWallet: {network: 'ETH', api_channels: {send: channel}},
        data: {},
      },
    };
    preflight = makePreflight(channel);
    navigation = {navigate: jest.fn()};
    setLoading = jest.fn();
    setPreventExit = jest.fn();
    act(() => {
      renderer = create(
        <Confirm
          navigation={navigation}
          route={{params: {preflight, balances: {coin: '10'}}}}
          setLoading={setLoading}
          setModalHeight={jest.fn()}
          setPreventExit={setPreventExit}
        />,
        {createNodeMock: () => ({flashScrollIndicators: jest.fn()})},
      );
    });
    act(() => jest.runOnlyPendingTimers());
    setLoading.mockClear();
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.useRealTimers();
  });

  it('blocks both the button and handler after an uncertain broadcast', async () => {
    const error = new Error('The send response could not be confirmed. Funds may have been sent.');
    error.ambiguousBroadcast = true;
    mockSendConvertOrCrossChain.mockRejectedValue(error);

    await act(async () => sendButton(renderer).props.onPress());

    // The disabled "Status unknown" action is the message; no sheet opens.
    expect(mockCreateAlert).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(sendButton(renderer).props.disabled).toBe(true);
    expect(sendButton(renderer).children).toEqual(['Status unknown']);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(setLoading).not.toHaveBeenCalled();
    expect(setPreventExit).toHaveBeenLastCalledWith(false);

    await act(async () => sendButton(renderer).props.onPress());
    expect(mockSendConvertOrCrossChain).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a preparation error before broadcast', async () => {
    mockSendConvertOrCrossChain.mockRejectedValue(new Error('Could not read the balance before sending.'));

    await act(async () => sendButton(renderer).props.onPress());

    // The old non-invoice confirm has no inline error, so it keeps a sheet.
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith(notSentTitle, notSentMessage);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(sendButton(renderer).props.disabled).toBe(false);
    expect(sendButton(renderer).children).toEqual([buttonLabel]);
    expect(setLoading).not.toHaveBeenCalled();
    expect(setPreventExit).toHaveBeenLastCalledWith(false);

    await act(async () => sendButton(renderer).props.onPress());
    expect(mockSendConvertOrCrossChain).toHaveBeenCalledTimes(2);
  });

  it('preserves a normal result error as retryable', async () => {
    mockSendConvertOrCrossChain.mockResolvedValue({err: true, result: 'Insufficient funds'});

    await act(async () => sendButton(renderer).props.onPress());

    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith(notSentTitle, notSentMessage);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(sendButton(renderer).props.disabled).toBe(false);
    expect(navigation.navigate).not.toHaveBeenCalled();
    await act(async () => sendButton(renderer).props.onPress());
    expect(mockSendConvertOrCrossChain).toHaveBeenCalledTimes(2);
  });

  it('submits once if the handler is pressed twice before the first send finishes', async () => {
    let resolveSend;
    mockSendConvertOrCrossChain.mockImplementation(() => new Promise(resolve => {resolveSend = resolve;}));
    let firstSend;
    await act(async () => {
      const onPress = sendButton(renderer).props.onPress;
      firstSend = onPress();
      await onPress();
    });

    expect(mockSendConvertOrCrossChain).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType('AnimatedActivityIndicatorBox')).toHaveLength(1);
    expect(sendButton(renderer)).toBeUndefined();
    expect(setLoading).not.toHaveBeenCalled();
    await act(async () => {
      resolveSend({err: false, result: {txid: 'accepted-transaction'}});
      await firstSend;
    });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });

  it('navigates with the accepted transaction and releases the loading state', async () => {
    mockSendConvertOrCrossChain.mockResolvedValue({err: false, result: {txid: 'accepted-transaction'}});

    await act(async () => sendButton(renderer).props.onPress());

    expect(navigation.navigate).toHaveBeenCalledWith(SEND_MODAL_FORM_STEP_RESULT, {
      txid: 'accepted-transaction', output: preflight.output, destination: 'destination',
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockCreateAlert).not.toHaveBeenCalled();
    expect(setLoading).not.toHaveBeenCalled();
    expect(setPreventExit).toHaveBeenLastCalledWith(false);
  });
});
