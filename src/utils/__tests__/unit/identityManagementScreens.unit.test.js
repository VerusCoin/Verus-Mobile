const mockApi = {loadIdentityForUpdate: jest.fn(), prepareIdentityUpdate: jest.fn(), sendIdentityUpdate: jest.fn()};
const mockParseRecipient = jest.fn();
const mockScrollTo = jest.fn();
const mockUnlink = jest.fn();
let mockState;
let mockManagement;
jest.mock('../../identityManagement/updateIdentity', () => mockApi);
jest.mock('../../identityManagement/unlinkAfterUpdate', () => ({unlinkUpdatedIdentity: (...args) => mockUnlink(...args)}));
jest.mock('../../identityManagement/identityDefinition', () => ({MAX_IDENTITY_PRIMARY_ADDRESSES: 25}));
jest.mock('../../identityManagement/recipient', () => ({recipientFromQr: (...args) => mockParseRecipient(...args)}));
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/IdentityManagement/IdentityManagementContext', () => ({
  useIdentityManagement: () => mockManagement,
}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 96}));
jest.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl', Keyboard: {dismiss: jest.fn()},
  Platform: {OS: 'ios'}, StyleSheet: {create: value => value, hairlineWidth: 1},
  useWindowDimensions: () => ({width: 320, height: 640, fontScale: 2}),
}));
jest.mock('react-native-paper', () => ({Text: 'Text', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 20})}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../components/SemiModal', () => 'SemiModal');
jest.mock('../../../components/BarcodeReader/BarcodeReader', () => 'BarcodeReader');
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => undefined}}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Keyboard} = require('react-native');
const {IdentityModify, IdentityTransfer, IdentityUpdateReview, IdentityUpdateResult} =
  require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityManagement/IdentityManagementScreens');

const fields = {
  primaryaddresses: ['Rwallet'], minimumsignatures: 1, privateaddress: 'zsOriginal',
  recoveryauthority: 'iRecovery', revocationauthority: 'iRevocation',
};
const model = {
  displayName: 'alice.VRSCTEST@', identityAddress: 'iAlice', chainTicker: 'VRSCTEST', systemId: 'test-system', isTestnet: true,
  fields, identity: {parent: 'iNamespace'},
  identityNames: {iRecovery: 'guardian', iRevocation: 'revoker@', iNamespace: 'VRSCTEST', iTreasury: 'treasury@'},
  signingAddress: 'Rwallet', fundingAddress: 'Rwallet', fundingSources: [
    {address: 'Rwallet', fundingName: 'Wallet address', isIdentity: false},
    {address: 'iTreasury', fundingName: 'treasury', isIdentity: true},
  ],
};
const makePlan = (changes = {}) => ({review: {
  ...model, mode: 'transfer', before: fields,
  after: {...fields, primaryaddresses: ['Rrecipient'], recoveryauthority: 'iAlice', revocationauthority: 'iAlice'},
  fee: '0.0001', feeCurrency: 'VRSCTEST', nativeTotalCost: '0.0001',
  returnFunds: true, returnAddress: 'Rwallet', changeAddress: 'iTreasury', changeName: 'treasury@',
  returnedFunds: [{currencyId: 'test-system', label: 'VRSCTEST', amount: '10'}],
  transferredFunds: [], fundingChange: [],
  fundingAddress: 'iTreasury', fundingName: 'treasury@', recipientName: 'satoshi@', losesControl: true,
  warnings: [], ...changes,
}});
const navigation = () => ({navigate: jest.fn(), reset: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()),
  getParent: jest.fn(() => ({goBack: jest.fn()}))});
const textContent = node => typeof node === 'string' ? node : (node.children || []).map(textContent).join('');
const button = (view, label) => view.root.findAllByType('Pressable').find(node =>
  node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
const input = (view, label) => view.root.findAllByType('TextInput').find(node => node.props.label === label);
const checkbox = (view, label = 'I understand who will control this identity') => view.root.findAllByType('Pressable').find(node =>
  node.props.accessibilityRole === 'checkbox' && node.props.accessibilityLabel === label);
const press = async node => {expect(node).toBeDefined(); await act(async () => node.props.onPress());};
const enter = async (view, label, value) => {await act(async () => input(view, label).props.onChangeText(value));};
const footerAction = (view, label) => {
  const matches = node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label;
  const actions = view.root.findAllByType('Pressable').filter(matches);
  expect(actions).toHaveLength(1);
  expect(view.root.findByType('ScrollView').findAllByType('Pressable').filter(matches)).toHaveLength(0);
  expect(view.root.findByProps({testID: 'registration-footer'}).findAllByType('Pressable').filter(matches)).toEqual(actions);
  return actions[0];
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
};
let views;
const mount = async (Component, props = {}) => {
  let view;
  await act(async () => {
    view = create(<Component navigation={props.navigation || navigation()}
      route={{params: {chain: 'VRSCTEST', identityAddress: 'iAlice', displayName: 'alice.VRSCTEST@'}}} {...props} />, {
      createNodeMock: node => node.type === 'ScrollView' ? {scrollTo: mockScrollTo} : null,
    });
  });
  views.push(view);
  return view;
};
beforeEach(() => {
  jest.clearAllMocks();
  views = [];
  mockState = {authentication: {activeAccount: {accountHash: 'alice'}, sessionEpoch: 1}, coins: {showBalance: true}, ledger: {balances: {
    'vrpc.Rwallet.test-system': {VRSCTEST: {confirmed: '2'}},
    'vrpc.iTreasury.test-system': {VRSCTEST: {confirmed: '1000'}},
  }}};
  mockManagement = {context: {sessionScope: {sessionScoped: true, accountHash: 'alice', sessionEpoch: 1}},
    plan: makePlan(), setPlan: jest.fn(), result: null, setResult: jest.fn(), reloadVersion: 0, setReloadVersion: jest.fn()};
  mockApi.loadIdentityForUpdate.mockReset().mockResolvedValue(model);
  mockApi.prepareIdentityUpdate.mockReset().mockResolvedValue(makePlan());
  mockApi.sendIdentityUpdate.mockReset().mockResolvedValue({txid: 'reviewed-transaction'});
  mockUnlink.mockReset().mockResolvedValue({unlinked: true});
  mockParseRecipient.mockReset().mockReturnValue('Rrecipient');
});
afterEach(() => act(() => views.forEach(view => view.unmount())));

test.each([[IdentityModify, 'Review changes'], [IdentityTransfer, 'Review transfer']])(
  'keeps the form primary action in the fixed footer', async (Component, label) => {
    const view = await mount(Component);
    const action = footerAction(view, label);
    if (Component === IdentityTransfer) {
      expect(action.props.disabled).toBe(true);
      await enter(view, 'New owner', 'satoshi@');
      expect(footerAction(view, label).props.disabled).toBe(false);
    }
    expect(mockApi.loadIdentityForUpdate).toHaveBeenCalledWith({chain: 'VRSCTEST', identityAddress: 'iAlice'}, mockManagement.context);
    expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
    expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  },
);

test('the modify form submits only changed fields and selects the highest funded payment source', async () => {
  const nav = navigation();
  const view = await mount(IdentityModify, {navigation: nav});
  expect(input(view, 'Recovery identity').props.value).toBe('guardian@');
  expect(input(view, 'Revocation identity').props.value).toBe('revoker@');
  await press(button(view, 'Add primary address'));
  await enter(view, 'Primary address 2', 'Rsecond');
  await enter(view, 'Required signatures', '2');
  await enter(view, 'Private address (optional)', '');
  await press(footerAction(view, 'Review changes'));
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledWith(model, {
    mode: 'modify', fundingAddress: 'iTreasury',
    changes: {primaryaddresses: ['Rwallet', 'Rsecond'], minimumsignatures: '2', privateaddress: ''},
  }, mockManagement.context);
  expect(mockManagement.setPlan).toHaveBeenLastCalledWith(await mockApi.prepareIdentityUpdate.mock.results[0].value);
  expect(nav.navigate).toHaveBeenCalledWith('IdentityUpdateReview');
  expect(fields.primaryaddresses).toEqual(['Rwallet']);
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('preparing a review locks editable controls and ignores rapid double taps', async () => {
  const prepared = deferred();
  mockApi.prepareIdentityUpdate.mockReturnValueOnce(prepared.promise);
  const nav = navigation();
  const view = await mount(IdentityModify, {navigation: nav});
  await enter(view, 'Private address (optional)', 'zsNew');
  const onPress = footerAction(view, 'Review changes').props.onPress;
  await act(async () => {onPress(); onPress();});
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(footerAction(view, 'Review changes').props.accessibilityState).toMatchObject({disabled: true, busy: true});
  view.root.findAllByType('TextInput').forEach(field => expect(field.props.disabled).toBe(true));
  expect(nav.navigate).not.toHaveBeenCalled();
  await act(async () => prepared.resolve(makePlan({mode: 'modify'})));
  expect(nav.navigate).toHaveBeenCalledTimes(1);
});

test('a QR scan fills the recipient once without preparing or sending a transaction', async () => {
  const view = await mount(IdentityTransfer);
  await press(button(view, 'Scan QR code'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
  const scanner = view.root.findByType('BarcodeReader');
  await act(async () => {
    scanner.props.onScan([{value: 'qr-payload'}]);
    scanner.props.onScan([{value: 'second-frame'}]);
  });
  expect(mockParseRecipient).toHaveBeenCalledTimes(1);
  expect(mockParseRecipient).toHaveBeenCalledWith('qr-payload', 'test-system');
  expect(input(view, 'New owner').props.value).toBe('Rrecipient');
  expect(view.root.findByType('SemiModal').props.visible).toBe(false);
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  await press(footerAction(view, 'Review transfer'));
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledWith(model, {
    mode: 'transfer', recipient: 'Rrecipient', fundingAddress: 'iTreasury', returnFunds: true, returnAddress: 'Rwallet',
  }, mockManagement.context);
});

test('invalid QR input keeps the previous recipient and reveals a readable error', async () => {
  mockParseRecipient.mockImplementationOnce(() => {throw new Error('This QR code is for a different network.');});
  const view = await mount(IdentityTransfer);
  await enter(view, 'New owner', 'satoshi@');
  await press(button(view, 'Scan QR code'));
  await act(async () => view.root.findByType('BarcodeReader').props.onScan([{value: 'wrong-network'}]));
  expect(input(view, 'New owner').props.value).toBe('satoshi@');
  expect(textContent(view.root.findByProps({accessibilityRole: 'alert'}))).toContain('different network');
  expect(mockScrollTo).toHaveBeenLastCalledWith({y: 0, animated: true});
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test('closing the scanner ignores a queued camera frame instead of replacing the recipient', async () => {
  const view = await mount(IdentityTransfer);
  await enter(view, 'New owner', 'satoshi@');
  await press(button(view, 'Scan QR code'));
  const onScan = view.root.findByType('BarcodeReader').props.onScan;
  await act(async () => view.root.findByType('SemiModal').props.onRequestClose());
  await act(async () => onScan([{value: 'late-camera-frame'}]));
  expect(input(view, 'New owner').props.value).toBe('satoshi@');
  expect(mockParseRecipient).not.toHaveBeenCalled();
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test.each([
  ['transfer', {mode: 'transfer', losesControl: false}],
  ['loss of control', {mode: 'modify', losesControl: true}],
  ['multisignature ownership', {mode: 'modify', losesControl: false, after: {...fields, primaryaddresses: ['Rwallet', 'Rother'], minimumsignatures: 2}}],
])('%s requires acknowledgement beside the fixed payment button', async (_, change) => {
  mockManagement.plan = makePlan(change);
  const view = await mount(IdentityUpdateReview);
  const label = change.mode === 'transfer' ? 'Pay & transfer identity' : 'Pay & save changes';
  expect(footerAction(view, label).props.disabled).toBe(true);
  await press(footerAction(view, label));
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  const footer = view.root.findByProps({testID: 'registration-footer'});
  expect(footer.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'checkbox')).toBe(checkbox(view));
  await press(checkbox(view));
  expect(footerAction(view, label).props.disabled).toBe(false);
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('review displays the exact fee, self authorities and retained private-payment consequences', async () => {
  const view = await mount(IdentityUpdateReview);
  const text = textContent(view.root);
  expect(text).toContain('0.0001 VRSCTEST');
  expect(text).toContain('No identity registration charge');
  expect(text).toContain('satoshi@');
  expect(text).toContain('This identity (alice.VRSCTEST@)');
  expect(text).toContain('Previous external authorities will no longer be able to revoke or recover it');
  expect(text).not.toContain('An external authority can still revoke or recover');
  expect(text).toContain('Private payments still go to this address’s existing owner');
  expect(text).toContain('zsOriginal');
  expect(text).not.toContain('iRecovery');
  expect(text).not.toContain('iRevocation');
  await press(button(view, 'Previous authorities'));
  expect(textContent(view.root)).toContain('guardian@');
  expect(textContent(view.root)).toContain('revoker@');
});

test('approval sends the exact displayed plan once and prevents leaving or changing acknowledgement while sending', async () => {
  const sent = deferred();
  mockApi.sendIdentityUpdate.mockReturnValueOnce(sent.promise);
  const nav = navigation();
  const plan = mockManagement.plan;
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  const send = footerAction(view, 'Pay & transfer identity').props.onPress;
  await act(async () => {send(); send();});
  expect(mockApi.sendIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(mockApi.sendIdentityUpdate.mock.calls[0][0]).toBe(plan);
  expect(mockApi.sendIdentityUpdate.mock.calls[0][1]).toBe(mockManagement.context);
  expect(footerAction(view, 'Pay & transfer identity').props.accessibilityState).toMatchObject({busy: true, disabled: true});
  expect(checkbox(view).props.disabled).toBe(true);
  const event = {preventDefault: jest.fn()};
  nav.addListener.mock.calls.find(([name]) => name === 'beforeRemove')[1](event);
  expect(event.preventDefault).toHaveBeenCalled();
  expect(nav.reset).not.toHaveBeenCalled();
  expect(mockUnlink).not.toHaveBeenCalled();
  await act(async () => sent.resolve({txid: 'approved-tx'}));
  expect(mockUnlink).toHaveBeenCalledWith(plan.review, mockManagement.context);
  expect(mockManagement.setResult).toHaveBeenCalledWith({txid: 'approved-tx', review: plan.review, unlinkRequested: true, unlinked: true});
  expect(nav.reset).toHaveBeenCalledWith({index: 0, routes: [{name: 'IdentityUpdateResult'}]});
});

test('a replacement review clears approval instead of retaining acceptance for the old parameters', async () => {
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  mockManagement.plan = makePlan({fee: '0.0002', nativeTotalCost: '0.0002'});
  await act(async () => view.update(<IdentityUpdateReview navigation={nav} />));
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  expect(footerAction(view, 'Pay & transfer identity').props.disabled).toBe(true);
  expect(textContent(view.root)).toContain('0.0002 VRSCTEST');
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('preparation errors scroll to the error and retain the entered recipient for correction', async () => {
  mockApi.prepareIdentityUpdate.mockRejectedValueOnce(new Error('Choose a valid recipient.'));
  const nav = navigation();
  const view = await mount(IdentityTransfer, {navigation: nav});
  await enter(view, 'New owner', 'bad recipient');
  await press(footerAction(view, 'Review transfer'));
  expect(textContent(view.root.findByProps({accessibilityRole: 'alert'}))).toBe('Choose a valid recipient.');
  expect(mockScrollTo).toHaveBeenLastCalledWith({y: 0, animated: true});
  expect(input(view, 'New owner').props.value).toBe('bad recipient');
  expect(nav.navigate).not.toHaveBeenCalled();
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('a changed identity offers a reload instead of retrying preparation against stale data', async () => {
  mockApi.prepareIdentityUpdate.mockRejectedValueOnce(Object.assign(new Error('Identity changed.'), {code: 'REVIEW_CHANGED'}));
  const view = await mount(IdentityTransfer);
  await enter(view, 'New owner', 'satoshi@');
  await press(footerAction(view, 'Review transfer'));
  await press(footerAction(view, 'Reload identity'));
  expect(mockApi.loadIdentityForUpdate).toHaveBeenCalledTimes(2);
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(footerAction(view, 'Review transfer').props.disabled).toBe(false);
  expect(input(view, 'New owner').props.value).toBe('satoshi@');
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('an expired approval clears the old plan and returns to reload the identity', async () => {
  mockApi.sendIdentityUpdate.mockRejectedValueOnce(Object.assign(new Error('This fee review has expired.'), {code: 'REVIEW_CHANGED'}));
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  await press(footerAction(view, 'Pay & transfer identity'));
  await press(footerAction(view, 'Reload identity'));
  expect(mockManagement.setPlan).toHaveBeenCalledWith(null);
  expect(mockManagement.setReloadVersion.mock.calls[0][0](3)).toBe(4);
  expect(nav.goBack).toHaveBeenCalledTimes(1);
  expect(mockApi.sendIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test('an uncertain broadcast consumes the review and opens transaction status without another attempt', async () => {
  mockApi.sendIdentityUpdate.mockRejectedValueOnce(Object.assign(new Error('Delivery could not be confirmed.'), {
    code: 'BROADCAST_UNKNOWN', txid: 'uncertain-tx',
  }));
  const plan = mockManagement.plan;
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  const send = footerAction(view, 'Pay & transfer identity').props.onPress;
  await act(async () => send());
  await act(async () => send());
  expect(mockApi.sendIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(mockManagement.setPlan).toHaveBeenCalledWith(null);
  expect(mockManagement.setResult).toHaveBeenCalledWith({txid: 'uncertain-tx', review: plan.review, deliveryUnknown: true});
  expect(nav.reset).toHaveBeenCalledWith({index: 0, routes: [{name: 'IdentityUpdateResult'}]});
  expect(mockUnlink).not.toHaveBeenCalled();
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test('an uncertain result shows the transaction ID and close action without claiming success', async () => {
  mockManagement.result = {txid: 'uncertain-tx', review: makePlan().review, deliveryUnknown: true};
  const nav = navigation();
  const view = await mount(IdentityUpdateResult, {navigation: nav});
  expect(textContent(view.root)).toContain('Delivery not confirmed');
  expect(textContent(view.root)).toContain('uncertain-tx');
  expect(textContent(view.root)).toContain('Check the transaction’s status before starting a new review');
  expect(textContent(view.root)).not.toContain('Update sent');
  expect(button(view, 'Retry unlink')).toBeUndefined();
  await press(footerAction(view, 'Close'));
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test('session rejection cannot populate a review or navigate', async () => {
  mockApi.prepareIdentityUpdate.mockRejectedValueOnce(Object.assign(new Error('Account changed'), {code: 'SESSION_CHANGED'}));
  const nav = navigation();
  const view = await mount(IdentityTransfer, {navigation: nav});
  await enter(view, 'New owner', 'satoshi@');
  mockManagement.setPlan.mockClear();
  await press(footerAction(view, 'Review transfer'));
  expect(nav.navigate).not.toHaveBeenCalled();
  expect(mockManagement.setPlan).not.toHaveBeenCalled();
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
});

test('late preparation completion after unmount cannot update the flow or navigate', async () => {
  const prepared = deferred();
  mockApi.prepareIdentityUpdate.mockReturnValueOnce(prepared.promise);
  const nav = navigation();
  const view = await mount(IdentityTransfer, {navigation: nav});
  await enter(view, 'New owner', 'satoshi@');
  mockManagement.setPlan.mockClear();
  await act(async () => {footerAction(view, 'Review transfer').props.onPress();});
  act(() => view.unmount());
  await act(async () => prepared.resolve(makePlan()));
  expect(mockManagement.setPlan).not.toHaveBeenCalled();
  expect(nav.navigate).not.toHaveBeenCalled();
});

test('a resolved preparation from a previous session cannot navigate before provider unmount', async () => {
  const prepared = deferred();
  mockApi.prepareIdentityUpdate.mockReturnValueOnce(prepared.promise);
  const nav = navigation();
  const view = await mount(IdentityTransfer, {navigation: nav});
  await enter(view, 'New owner', 'satoshi@');
  mockManagement.setPlan.mockClear();
  await act(async () => {footerAction(view, 'Review transfer').props.onPress();});
  mockState = {...mockState, authentication: {activeAccount: {accountHash: 'bob'}, sessionEpoch: 2}};
  await act(async () => prepared.resolve(makePlan()));
  expect(mockManagement.setPlan).not.toHaveBeenCalled();
  expect(nav.navigate).not.toHaveBeenCalled();
});

test('a completed send from a previous session cannot update result state or navigation', async () => {
  const sent = deferred();
  mockApi.sendIdentityUpdate.mockReturnValueOnce(sent.promise);
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  await act(async () => {footerAction(view, 'Pay & transfer identity').props.onPress();});
  mockState = {...mockState, authentication: {activeAccount: {accountHash: 'bob'}, sessionEpoch: 2}};
  await act(async () => sent.resolve({txid: 'old-session-tx'}));
  expect(mockManagement.setResult).not.toHaveBeenCalled();
  expect(nav.reset).not.toHaveBeenCalled();
});

test('changing the route while an identity loads cannot apply the old identity to the new form', async () => {
  const firstLoad = deferred();
  const secondModel = {...model, identityAddress: 'iBob', displayName: 'bob.VRSCTEST@'};
  mockApi.loadIdentityForUpdate.mockReturnValueOnce(firstLoad.promise).mockResolvedValueOnce(secondModel);
  const nav = navigation();
  const view = await mount(IdentityTransfer, {navigation: nav});
  expect(footerAction(view, 'Load identity').props.accessibilityState.busy).toBe(true);
  await act(async () => view.update(<IdentityTransfer navigation={nav}
    route={{params: {chain: 'VRSCTEST', identityAddress: 'iBob', displayName: 'bob.VRSCTEST@'}}} />));
  expect(textContent(view.root)).toContain('bob.VRSCTEST@');
  await act(async () => firstLoad.resolve(model));
  expect(textContent(view.root)).not.toContain('alice.VRSCTEST@');
  await enter(view, 'New owner', 'satoshi@');
  await press(footerAction(view, 'Review transfer'));
  expect(mockApi.prepareIdentityUpdate.mock.calls[0][0]).toBe(secondModel);
});

test('result keeps its Done action fixed and does not initiate more identity operations', async () => {
  const parentBack = jest.fn();
  const nav = navigation();
  nav.getParent.mockReturnValue({goBack: parentBack});
  mockManagement.result = {txid: 'sent-tx', review: mockManagement.plan.review};
  const view = await mount(IdentityUpdateResult, {navigation: nav});
  expect(textContent(view.root)).toContain('waiting for network confirmation');
  await press(footerAction(view, 'Done'));
  expect(parentBack).toHaveBeenCalledTimes(1);
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.loadIdentityForUpdate).not.toHaveBeenCalled();
});

test('returning identity funds is selected by default and uses the main wallet address', async () => {
  const view = await mount(IdentityTransfer);
  expect(checkbox(view, 'Return identity funds to my wallet').props.accessibilityState.checked).toBe(true);
  expect(textContent(view.root)).toContain('Main wallet address');
  expect(textContent(view.root)).toContain('Rwallet');
  await enter(view, 'New owner', 'satoshi@');
  await press(footerAction(view, 'Review transfer'));
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledWith(model, {
    mode: 'transfer', recipient: 'satoshi@', fundingAddress: 'iTreasury', returnFunds: true, returnAddress: 'Rwallet',
  }, mockManagement.context);
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
});

test('opting out of returning funds warns about the gift and includes the explicit choice in preparation', async () => {
  const view = await mount(IdentityTransfer);
  await press(checkbox(view, 'Return identity funds to my wallet'));
  expect(checkbox(view, 'Return identity funds to my wallet').props.accessibilityState.checked).toBe(false);
  expect(textContent(view.root)).toContain('The new owner will receive the identity’s funds on this network');
  expect(textContent(view.root)).toContain('included in your total transfer cost');
  await enter(view, 'New owner', 'Rrecipient');
  await press(footerAction(view, 'Review transfer'));
  expect(mockApi.prepareIdentityUpdate).toHaveBeenCalledWith(model, {
    mode: 'transfer', recipient: 'Rrecipient', fundingAddress: 'iTreasury', returnFunds: false, returnAddress: 'Rwallet',
  }, mockManagement.context);
});

test('returned native and token funds are displayed separately from the fee and are not a transfer cost', async () => {
  mockManagement.plan = makePlan({returnedFunds: [
    {currencyId: 'test-system', label: 'VRSCTEST', amount: '10'},
    {currencyId: 'iDollar', label: 'Dollar', amount: '25.5'},
  ]});
  const view = await mount(IdentityUpdateReview);
  const costCard = view.root.findAllByType('Text').find(node => textContent(node) === 'Total cost').parent;
  expect(textContent(costCard)).toContain('0.0001 VRSCTEST');
  expect(textContent(costCard)).not.toContain('25.5');
  expect(textContent(view.root)).toContain('Funds returned to you');
  expect(textContent(view.root)).toContain('25.5');
  expect(textContent(view.root)).toContain('Dollar');
  expect(textContent(view.root)).toContain('They are not a cost');
  expect(textContent(view.root)).toContain('Return addressRwallet');
});

test('unrelated fee-source change returns to its original identity and is separate from the transferred identity’s funds', async () => {
  mockManagement.plan = makePlan({
    returnedFunds: [{currencyId: 'test-system', label: 'VRSCTEST', amount: '10'}],
    fundingChange: [
      {currencyId: 'test-system', label: 'VRSCTEST', amount: '499.9999'},
      {currencyId: 'iDollar', label: 'Dollar', amount: '25.5'},
    ],
    returnAddress: 'Rwallet', changeAddress: 'iTreasury', changeName: 'treasury@',
  });
  const view = await mount(IdentityUpdateReview);
  const costCard = view.root.findAllByType('Text').find(node => textContent(node) === 'Total cost').parent;
  expect(textContent(costCard)).toContain('Fee paid fromtreasury@');
  expect(textContent(costCard)).toContain('Unspent change returns to this payment address');
  expect(textContent(costCard)).not.toContain('main wallet');
  expect(textContent(view.root)).toContain('Funds returned to youVRSCTEST10');
  expect(textContent(view.root)).toContain('Return addressRwallet');
  expect(textContent(view.root)).not.toContain('499.9999');
  await press(button(view, 'Additional payment change'));
  const paymentChange = textContent(button(view, 'Additional payment change').parent);
  expect(paymentChange).toContain('VRSCTEST499.9999');
  expect(paymentChange).toContain('Dollar25.5');
  expect(paymentChange).toContain('Change returns totreasury@');
  expect(paymentChange).toContain('Unused funds from the fee payment source return to that payment address');
  expect(paymentChange).not.toContain('main wallet');
  expect(paymentChange).not.toContain('iTreasury');
  await press(button(view, 'Transaction details'));
  expect(textContent(button(view, 'Transaction details').parent)).toContain('Change addressiTreasury');
  footerAction(view, 'Pay & transfer identity');
});

test('change paid by the main wallet is identified as main-wallet change while identity funds return separately', async () => {
  mockManagement.plan = makePlan({fundingAddress: 'Rwallet', fundingName: 'Wallet address',
    changeAddress: 'Rwallet', changeName: 'Main wallet address',
    fundingChange: [{currencyId: 'test-system', label: 'VRSCTEST', amount: '1.9999'}],
  });
  const view = await mount(IdentityUpdateReview);
  expect(textContent(view.root)).toContain('Payment change returns to your main wallet address');
  await press(button(view, 'Additional payment change'));
  expect(textContent(button(view, 'Additional payment change').parent)).toContain('Change returns toMain wallet address');
});

test('all gifted currencies appear in total cost without counting an identity-funded fee twice', async () => {
  mockManagement.plan = makePlan({returnFunds: false, returnAddress: null, fundingAddress: 'iAlice',
    fundingName: 'alice.VRSCTEST@', changeAddress: 'iAlice', nativeTotalCost: '10', returnedFunds: [],
    transferredFunds: [
      {currencyId: 'test-system', label: 'VRSCTEST', amount: '9.9999'},
      {currencyId: 'iDollar', label: 'Dollar', amount: '25.5'},
      {currencyId: 'iGold', label: 'Gold', amount: '0.00000001'},
    ],
  });
  const view = await mount(IdentityUpdateReview);
  const costCard = view.root.findAllByType('Text').find(node => textContent(node) === 'Total cost').parent;
  const cost = textContent(costCard);
  expect(cost).toContain('10 VRSCTEST');
  expect(cost).toContain('Network fee0.0001 VRSCTEST');
  expect(cost).toContain('Dollar25.5');
  expect(cost).toContain('Gold0.00000001');
  expect(cost).not.toContain('10.0001');
  expect(cost).not.toContain('9.9999');
  expect(textContent(view.root)).toContain('Funds given to the new ownerVRSCTEST9.9999');
  expect(textContent(view.root)).toContain('You give up these funds when you transfer the identity');
});

test.each(['modify', 'transfer'])('%s defaults to unlinking only when the update removes signing control', async mode => {
  mockManagement.plan = makePlan({mode, losesControl: true});
  const view = await mount(IdentityUpdateReview);
  expect(checkbox(view, 'Unlink from my wallet after sending').props.accessibilityState.checked).toBe(true);
  expect(textContent(view.root)).toContain('Uncheck to keep viewing it here');
  await press(checkbox(view));
  await press(footerAction(view, mode === 'transfer' ? 'Pay & transfer identity' : 'Pay & save changes'));
  expect(mockUnlink).toHaveBeenCalledWith(mockManagement.plan.review, mockManagement.context);
  expect(mockManagement.setResult).toHaveBeenCalledWith(expect.objectContaining({unlinkRequested: true, unlinked: true}));
});

test.each(['modify', 'transfer'])('%s respects the unlink opt-out after losing signing control', async mode => {
  mockManagement.plan = makePlan({mode, losesControl: true});
  const view = await mount(IdentityUpdateReview);
  await press(checkbox(view, 'Unlink from my wallet after sending'));
  expect(checkbox(view, 'Unlink from my wallet after sending').props.accessibilityState.checked).toBe(false);
  await press(checkbox(view));
  await press(footerAction(view, mode === 'transfer' ? 'Pay & transfer identity' : 'Pay & save changes'));
  expect(mockUnlink).not.toHaveBeenCalled();
  expect(mockManagement.setResult).toHaveBeenCalledWith(expect.objectContaining({unlinkRequested: false, unlinked: false}));
});

test.each(['modify', 'transfer'])('%s keeps the link when signing control is retained', async mode => {
  mockManagement.plan = makePlan({mode, losesControl: false});
  const view = await mount(IdentityUpdateReview);
  expect(checkbox(view, 'Unlink from my wallet after sending')).toBeUndefined();
  if (mode === 'transfer') await press(checkbox(view));
  await press(footerAction(view, mode === 'transfer' ? 'Pay & transfer identity' : 'Pay & save changes'));
  expect(mockApi.sendIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(mockUnlink).not.toHaveBeenCalled();
  expect(mockManagement.setResult).toHaveBeenCalledWith(expect.objectContaining({unlinkRequested: false, unlinked: false}));
});

test('unlink choices reset to the opt-out default for a replacement review', async () => {
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view, 'Unlink from my wallet after sending'));
  await press(checkbox(view));
  mockManagement.plan = makePlan({fee: '0.0002', nativeTotalCost: '0.0002'});
  await act(async () => view.update(<IdentityUpdateReview navigation={nav} />));
  expect(checkbox(view, 'Unlink from my wallet after sending').props.accessibilityState.checked).toBe(true);
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  expect(mockUnlink).not.toHaveBeenCalled();
});

test('a validation failure before broadcast never starts local unlinking', async () => {
  mockApi.sendIdentityUpdate.mockRejectedValueOnce(new Error('Transaction rejected before sending.'));
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  await press(footerAction(view, 'Pay & transfer identity'));
  expect(mockUnlink).not.toHaveBeenCalled();
  expect(mockManagement.setResult).not.toHaveBeenCalled();
  expect(nav.reset).not.toHaveBeenCalled();
});

test('an unlink failure after accepted broadcast still opens the successful transaction result', async () => {
  mockUnlink.mockRejectedValueOnce(new Error('Wallet refresh failed.'));
  const nav = navigation();
  const view = await mount(IdentityUpdateReview, {navigation: nav});
  await press(checkbox(view));
  await press(footerAction(view, 'Pay & transfer identity'));
  expect(mockApi.sendIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(mockManagement.setResult).toHaveBeenCalledWith({
    txid: 'reviewed-transaction', review: mockManagement.plan.review,
    unlinkRequested: true, unlinked: false, unlinkError: 'Wallet refresh failed.',
  });
  expect(nav.reset).toHaveBeenCalledWith({index: 0, routes: [{name: 'IdentityUpdateResult'}]});
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
});

test('Retry unlink stays in the fixed footer and retries only local cleanup, with duplicate and exit guards', async () => {
  const cleanup = deferred();
  mockUnlink.mockReturnValueOnce(cleanup.promise);
  mockManagement.result = {txid: 'accepted-tx', review: mockManagement.plan.review,
    unlinkRequested: true, unlinked: false, unlinkError: 'Wallet refresh failed.'};
  const nav = navigation();
  const view = await mount(IdentityUpdateResult, {navigation: nav});
  expect(textContent(view.root)).toContain('Your update was sent, but unlinking needs another try');
  expect(textContent(view.root)).toContain('it does not send another transaction');
  const retry = footerAction(view, 'Retry unlink').props.onPress;
  await act(async () => {retry(); retry();});
  expect(mockUnlink).toHaveBeenCalledTimes(1);
  expect(mockUnlink).toHaveBeenCalledWith(mockManagement.result.review, mockManagement.context);
  expect(footerAction(view, 'Done').props.disabled).toBe(true);
  expect(footerAction(view, 'Retry unlink').props.accessibilityState).toMatchObject({disabled: true, busy: true});
  const event = {preventDefault: jest.fn()};
  nav.addListener.mock.calls.find(([name]) => name === 'beforeRemove')[1](event);
  expect(event.preventDefault).toHaveBeenCalled();
  await act(async () => cleanup.resolve({unlinked: true}));
  expect(mockManagement.setResult).toHaveBeenCalledWith({...mockManagement.result, unlinked: true, unlinkError: null});
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.loadIdentityForUpdate).not.toHaveBeenCalled();
});

test('a failed local retry leaves the accepted transaction available and can never repeat its payment', async () => {
  mockUnlink.mockRejectedValueOnce(new Error('Still unable to refresh.'));
  mockManagement.result = {txid: 'accepted-tx', review: mockManagement.plan.review,
    unlinkRequested: true, unlinked: false, unlinkError: 'Wallet refresh failed.'};
  const view = await mount(IdentityUpdateResult);
  await press(footerAction(view, 'Retry unlink'));
  expect(textContent(view.root)).toContain('accepted-tx');
  expect(textContent(view.root)).toContain('Still unable to refresh');
  expect(footerAction(view, 'Done').props.disabled).toBeFalsy();
  expect(mockManagement.setResult).not.toHaveBeenCalled();
  expect(mockApi.sendIdentityUpdate).not.toHaveBeenCalled();
  expect(mockApi.prepareIdentityUpdate).not.toHaveBeenCalled();
});

test('the successful unlink result confirms wallet cards were refreshed and offers no retry', async () => {
  mockManagement.result = {txid: 'accepted-tx', review: mockManagement.plan.review,
    unlinkRequested: true, unlinked: true};
  const view = await mount(IdentityUpdateResult);
  expect(textContent(view.root)).toContain('The identity has been unlinked and your wallet cards refreshed');
  expect(button(view, 'Retry unlink')).toBeUndefined();
  footerAction(view, 'Done');
  expect(mockUnlink).not.toHaveBeenCalled();
});
