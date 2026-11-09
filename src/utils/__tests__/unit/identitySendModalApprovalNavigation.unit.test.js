let mockState;
const mockSubmit = jest.fn();
const mockAssertContext = jest.fn();
const mockRevokeRender = jest.fn(() => null);
const mockRecoverRender = jest.fn(() => null);
jest.mock('react-native', () => ({Alert: {alert: jest.fn()}, ScrollView: 'ScrollView', View: 'View', TouchableOpacity: 'TouchableOpacity'}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('react-native-paper', () => ({Text: 'Text'}));
jest.mock('../../../components/Button', () => 'Button');
jest.mock('../../../components/AnimatedSuccessCheckmark', () => 'SuccessCheckmark');
jest.mock('../../../styles', () => ({}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));
jest.mock('../../fullyqualifiedname', () => ({convertFqnToDisplayFormat: value => value}));
jest.mock('../../CoinData/CoinData', () => ({explorers: {VRSC: 'https://example.invalid'}}));
jest.mock('react-redux', () => ({useDispatch: () => jest.fn(), useSelector: selector => selector(mockState)}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../identityUpdate/verifiedSubmission', () => ({assertIdentityUpdateContext: (...args) => mockAssertContext(...args), submitReviewedIdentityUpdate: (...args) => mockSubmit(...args)}));
jest.mock('../../seedCrypt', () => ({decryptkey: () => 'seed'}));
jest.mock('../../keys', () => ({deriveKeyPair: async () => ({privKey: 'authority-key'})}));
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {VRSC: {}}}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({closeSendModal: jest.fn()}));
jest.mock('../../../components/SendModal/RevokeIdentity/RevokeIdentityConfirm/RevokeIdentityConfirm.render', () => ({RevokeIdentityConfirmRender: (...args) => mockRevokeRender(...args)}));
jest.mock('../../../components/SendModal/RecoverIdentity/RecoverIdentityConfirm/RecoverIdentityConfirm.render', () => ({RecoverIdentityConfirmRender: (...args) => mockRecoverRender(...args)}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Revoke = require('../../../components/SendModal/RevokeIdentity/RevokeIdentityConfirm/RevokeIdentityConfirm').default;
const Recover = require('../../../components/SendModal/RecoverIdentity/RecoverIdentityConfirm/RecoverIdentityConfirm').default;
const {API_SEND} = require('../../constants/intervalConstants');

beforeEach(() => {
  jest.clearAllMocks();
  mockAssertContext.mockReset();
  mockState = {sendModal: {requestId: 'request', coinObj: {id: 'VRSCTEST'}, data: {},
    subWallet: {api_channels: {[API_SEND]: 'vrpc.address.system'}}}, authentication: {instanceKey: 'instance', activeAccount: {accountHash: 'account'}}, coins: {activeCoinList: []}};
  mockSubmit.mockResolvedValue({txid: 'sent-txid'});
});

test.each([[Revoke, mockRevokeRender, 'authority-key'], [Recover, mockRecoverRender, 'authority-key']])(
  '%p carries the signed-out review, funding approval and input ordering through confirmation', async (Component, render, key) => {
    mockState.authentication = {...mockState.authentication, signedIn: false, activeAccount: null};
    const approval = Object.freeze({systemId: 'system', nativeFee: '10000'});
    const inputs = [{txid: 'identity', outputIndex: 3}, {txid: 'funding', outputIndex: 1}];
    const built = {hex: 'reviewed-hex', utxos: inputs, fundingApproval: approval};
    const context = {systemId: 'system', modalRequestId: 'request', allowSignedOut: true,
      sessionScope: {accountHash: null, sessionEpoch: 1, sessionScoped: true}};
    const props = {route: {params: {txHex: built.hex, utxos: inputs, fundingApproval: approval, updateContext: context,
      revocationResult: built, recoveryResult: built, fee: '0.0001', feeCurrency: 'VRSCTEST'}},
      navigation: {navigate: jest.fn()}, setLoading: jest.fn(), setPreventExit: jest.fn(), setModalHeight: jest.fn()};
    let mounted;
    act(() => { mounted = create(<Component {...props} />); });
    await act(async () => render.mock.calls.at(-1)[0].submitData());
    const call = mockSubmit.mock.calls[0][0];
    expect(call.context).toBe(context);
    expect(call.built.fundingApproval).toBe(approval);
    expect(call.built.utxos).toBe(inputs);
    await expect(call.getKeys()).resolves.toEqual([[key], [key]]);
    expect(props.navigation.navigate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({txid: 'sent-txid'}));
    expect(props.setLoading).toHaveBeenLastCalledWith(false);
    expect(props.setPreventExit).toHaveBeenLastCalledWith(false);
    act(() => mounted.unmount());
  },
);

test.each([[Revoke, mockRevokeRender], [Recover, mockRecoverRender]])(
  '%p does not advance a replacement dialog after an old submission succeeds', async (Component, render) => {
    mockState.sendModal.requestId = 'old-request';
    const built = {hex: 'reviewed-hex', utxos: [], fundingApproval: {nativeFee: '10000'}};
    const context = {systemId: 'system', modalRequestId: 'old-request'};
    const props = {route: {params: {txHex: built.hex, utxos: [], fundingApproval: built.fundingApproval, updateContext: context,
      revocationResult: built, recoveryResult: built}}, navigation: {navigate: jest.fn()},
      setLoading: jest.fn(), setPreventExit: jest.fn(), setModalHeight: jest.fn()};
    let release;
    mockSubmit.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    let mounted;
    act(() => { mounted = create(<Component {...props} />); });
    let pending;
    await act(async () => { pending = render.mock.calls.at(-1)[0].submitData(); await Promise.resolve(); });
    mockState.sendModal = {...mockState.sendModal, requestId: 'replacement-request'};
    mockAssertContext.mockImplementation(() => { throw Object.assign(new Error('Dialog replaced'), {code: 'SESSION_CHANGED'}); });
    await act(async () => { release({txid: 'old-submitted-txid'}); await pending; });
    expect(props.navigation.navigate).not.toHaveBeenCalled();
    expect(props.setLoading).not.toHaveBeenCalledWith(false);
    expect(props.setPreventExit).not.toHaveBeenCalledWith(false);
    expect(require('react-native').Alert.alert).not.toHaveBeenCalled();
    act(() => mounted.unmount());
  },
);

test.each([[Revoke, mockRevokeRender], [Recover, mockRecoverRender]])(
  '%p releases loading and exit protection when its still-open request is cancelled', async (Component, render) => {
    const built = {hex: 'reviewed-hex', utxos: [], fundingApproval: {nativeFee: '10000'}};
    const context = {systemId: 'system', modalRequestId: 'request', allowSignedOut: true};
    const props = {route: {params: {updateContext: context, revocationResult: built, recoveryResult: built}},
      navigation: {navigate: jest.fn()}, setLoading: jest.fn(), setPreventExit: jest.fn(), setModalHeight: jest.fn()};
    const cancelled = Object.assign(new Error('Session changed'), {code: 'SESSION_CHANGED'});
    mockSubmit.mockRejectedValueOnce(cancelled);
    mockAssertContext.mockImplementation(() => { throw cancelled; });
    let mounted;
    act(() => { mounted = create(<Component {...props} />); });
    await act(async () => render.mock.calls.at(-1)[0].submitData());
    expect(props.setLoading.mock.calls).toEqual([[true], [false]]);
    expect(props.setPreventExit.mock.calls).toEqual([[true], [false]]);
    expect(props.navigation.navigate).not.toHaveBeenCalled();
    expect(require('react-native').Alert.alert).not.toHaveBeenCalled();
    act(() => mounted.unmount());
  },
);

test.each([[Revoke, mockRevokeRender], [Recover, mockRecoverRender]])(
  '%p sends uncertain delivery to a terminal result and ignores a second press', async (Component, render) => {
    const built = {hex: 'reviewed-hex', utxos: [], fundingApproval: {nativeFee: '10000'}};
    const context = {systemId: 'system', modalRequestId: 'request'};
    const props = {route: {params: {txHex: built.hex, utxos: [], fundingApproval: built.fundingApproval, updateContext: context,
      revocationResult: built, recoveryResult: built}}, navigation: {navigate: jest.fn()},
      setLoading: jest.fn(), setPreventExit: jest.fn(), setModalHeight: jest.fn()};
    mockSubmit.mockRejectedValueOnce(Object.assign(new Error('Delivery not confirmed'), {code: 'BROADCAST_UNKNOWN', txid: 'uncertain-tx'}));
    let mounted;
    act(() => { mounted = create(<Component {...props} />); });
    const submit = render.mock.calls.at(-1)[0].submitData;
    await act(async () => submit());
    await act(async () => submit());
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(props.navigation.navigate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      txid: 'uncertain-tx', deliveryUnknown: true,
    }));
    expect(props.setLoading).toHaveBeenCalledWith(false);
    expect(props.setPreventExit).toHaveBeenCalledWith(false);
    expect(require('react-native').Alert.alert).not.toHaveBeenCalled();
    act(() => mounted.unmount());
  },
);

test.each([
  require('../../../components/SendModal/RevokeIdentity/RevokeIdentityResult/RevokeIdentityResult.render').RevokeIdentityResultRender,
  require('../../../components/SendModal/RecoverIdentity/RecoverIdentityResult/RecoverIdentityResult.render').RecoverIdentityResultRender,
])('%p presents uncertain delivery with status details and close, without a success claim', Render => {
  const finishSend = jest.fn();
  const openExplorer = jest.fn();
  let view;
  act(() => {view = create(<Render
    targetId={{fullyqualifiedname: 'alice@', identity: {identityaddress: 'iAlice'}}}
    networkObj={{id: 'VRSC', display_name: 'Verus'}} txid="uncertain-tx" deliveryUnknown
    finishSend={finishSend} openExplorer={openExplorer}
  />);});
  const text = view.root.findAllByType('Text').map(node => node.children.join('')).join(' ');
  expect(text).toContain('Delivery not confirmed');
  expect(text).toContain('uncertain-tx');
  expect(text).toContain('Check its status before starting a new review');
  expect(text).not.toContain('has been revoked');
  expect(text).not.toContain('has been recovered');
  expect(view.root.findAllByType('SuccessCheckmark')).toHaveLength(0);
  const buttons = view.root.findAllByType('Button');
  expect(buttons.map(button => button.props.children)).toEqual(['Details', 'Close']);
  act(() => buttons[0].props.onPress());
  act(() => buttons[1].props.onPress());
  expect(openExplorer).toHaveBeenCalledTimes(1);
  expect(finishSend).toHaveBeenCalledTimes(1);
  expect(mockSubmit).not.toHaveBeenCalled();
  act(() => view.unmount());
});
