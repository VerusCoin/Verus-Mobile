let mockState;
const mockProcess = jest.fn();
const mockLoadIds = jest.fn();
const mockAlert = jest.fn();
const mockGetIdentity = jest.fn();
let mockCoins;

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  SafeAreaView: 'SafeAreaView', ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity', View: 'View', AppState: {currentState: 'active'},
}));
jest.mock('react-native-paper', () => ({...jest.requireActual('react-native-paper'), Portal: 'Portal', Text: 'Text'}));
jest.mock('@react-navigation/native', () => ({useNavigation: () => ({
  isFocused: () => true, addListener: () => jest.fn(), getParent: () => undefined,
})}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('../../../components/Button', () => 'Button');
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'Loading');
jest.mock('../../../components/SemiModal', () => 'SemiModal');
jest.mock('../../../components/VerusIdDetailsModal/VerusIdDetailsModal', () => 'IdentityModal');
jest.mock('../../../styles/appEncryption.styles', () => ({}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openAuthenticateUserModal: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: (...args) => mockAlert(...args), resolveAlert: jest.fn()}));
jest.mock('../../math', () => ({unixToDate: () => 'Today'}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: () => 'VRSC'}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {
  findCoinObj: chainId => mockCoins[chainId], getBasicCoinObj: chainId => mockCoins[chainId],
}}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: (...args) => mockGetIdentity(...args)}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {initEndpoint: jest.fn()}}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));
jest.mock('../../auth/authBox', () => ({requestServiceStoredData: (...args) => mockLoadIds(...args)}));
jest.mock('../../../../env', () => ({VERUSID_NETWORK_DEFAULT: 'VRSC'}));
jest.mock('../../deeplink/handlers/appEncryptionRequestHandler', () => ({processAppEncryptionRequest: (...args) => mockProcess(...args)}));
jest.mock('../../deeplink/genericResponse/ensureGenericResponseSigner', () => ({ensureGenericResponseSigner: jest.fn()}));
jest.mock('../../fullyqualifiedname', () => ({convertFqnToDisplayFormat: value => value}));
jest.mock('verus-typescript-primitives', () => ({...jest.requireActual('verus-typescript-primitives'), GenericResponse: class {
  constructor(envelope = {}) { this.details = envelope.details || []; }
  fromBuffer(bytes) { this.details = JSON.parse(bytes.toString()); }
  toBuffer() { return Buffer.from(JSON.stringify(this.details)); }
  setFlags() {}
}}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Review = require('../../../containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo').default;
const {
  AuthenticationRequestDetails, AuthenticationRequestOrdinalVDXFObject,
  CompactAddressObject, GenericResponse, RecipientConstraint, toIAddress,
} = require('verus-typescript-primitives');
const {VERUSID_SERVICE_ID} = require('../../constants/services');
const {DLIGHT_PRIVATE} = require('../../constants/intervalConstants');
const VrpcProvider = require('../../vrpc/vrpcInterface').default;
const userID = toIAddress('user', 'VRSC');
const otherID = toIAddress('other', 'VRSC');
const systemID = toIAddress('VRSC', 'VRSC');
const otherSystemID = toIAddress('otherchain', 'VRSC');
const parentID = toIAddress('parent', 'VRSC');
const constrainedRequest = constraints => ({
  ...props.request,
  toBuffer: () => Buffer.from(JSON.stringify(constraints)),
  details: [new AuthenticationRequestOrdinalVDXFObject({
    data: new AuthenticationRequestDetails({
      recipientConstraints: constraints.map(([type, identity]) => new RecipientConstraint({
        type, identity: CompactAddressObject.fromIAddress(identity),
      })),
    }),
  })],
});
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return {promise, resolve};
};
const textOf = node => node.children.filter(child => typeof child === 'string' || typeof child === 'number').join('');
const text = view => view.root.findAllByType('Text').map(textOf).join('\n');
const APPROVE = 'Share encryption address';
const rawText = node => typeof node === 'string' ? node : (node.children || []).map(rawText).join('');
const button = (view, label) => view.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'button' &&
  (node.props.accessibilityLabel === label || rawText(node) === label), {deep: false})[0];
// A button handles the press on itself or on the component that wraps it.
const pressable = node => {
  let current = node;
  while (current && !current.props.onPress) current = current.parent;
  return current;
};
const onPressOf = node => pressable(node).props.onPress;
const isDisabled = node => node.props.accessibilityState.disabled;
let props, views;
const mount = async () => {
  let view;
  await act(async () => { view = create(<Review {...props} />); });
  views.add(view);
  return view;
};
const update = async view => act(async () => { view.update(<Review {...props} />); });
const changeSession = change => {
  if (change === 'profile') mockState.authentication.activeAccount = {accountHash: 'other'};
  if (change === 'epoch') mockState.authentication.sessionEpoch++;
  if (change === 'sign-out') mockState.authentication.signedIn = false;
  if (change === 'network') mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
  if (change === 'deeplink') mockState.deeplink.requestId++;
  if (change === 'request') props = {...props, request: {...props.request, toBuffer: () => Buffer.from('replacement')}};
};

beforeEach(() => {
  jest.clearAllMocks();
  views = new Set();
  mockCoins = {
    VRSC: {id: 'VRSC', system_id: systemID, vrpc_endpoints: ['https://example.com']},
    OTHER: {id: otherSystemID, system_id: otherSystemID, vrpc_endpoints: ['https://other.example.com']},
  };
  mockCoins[systemID] = mockCoins.VRSC;
  mockCoins[otherSystemID] = mockCoins.OTHER;
  mockState = {
    authentication: {
      signedIn: true, sessionEpoch: 1, accounts: [],
      activeAccount: {accountHash: 'profile', keys: Object.fromEntries(
        ['VRSC', 'VRSCTEST', otherSystemID].map(chain => [chain, {[DLIGHT_PRIVATE]: {}}]))},
    },
    deeplink: {id: 'generic', data: 'original', requestId: 1},
    coins: {activeCoinList: []}, sendModal: {type: null}, services: {stored: {[VERUSID_SERVICE_ID]: {}}},
  };
  mockLoadIds.mockReset().mockResolvedValue({linked_ids: {VRSC: {[userID]: 'user@', [otherID]: 'other@'}}});
  mockGetIdentity.mockReset().mockResolvedValue({result: {identity: {parent: parentID}}});
  mockProcess.mockReset().mockResolvedValue({
    responseDetail: {encryptedData: 'ciphertext'},
    encryptedDescriptorJson: {objectdata: 'ciphertext'},
  });
  props = {
    request: {details: [], isSigned: () => true, isTestnet: () => false, toBuffer: () => Buffer.from('approved-request')},
    response: new GenericResponse(), detailIndex: 0, next: jest.fn(), cancel: jest.fn(),
    signerFqn: 'requester@', signerIdentityID: 'iSigner', signerSystemID: systemID, signerSystemName: 'VRSC',
    appScopeID: 'iScope', appScopeFqn: 'scope@', derivationNumber: 7,
    hasDerivationID: false, encryptResponseToAddress: 'zs-recipient',
  };
});

afterEach(() => act(() => views.forEach(view => view.unmount())));

it('shows the app scope, primary index, selected user and response recipient', async () => {
  const view = await mount();
  const content = text(view);
  for (const expected of ['scope@', 'iScope', '#7', 'user@', 'zs-recipient', 'Response encryption recipient']) {
    expect(content).toContain(expected);
  }
  expect(content).not.toContain('Secondary key number');
  expect(content).not.toContain('Your signing identity');
});

it('shows an unregistered nested identity and its independent index', async () => {
  props = {...props, hasDerivationID: true, derivationIdentityID: 'iUnregistered', secondaryDerivationNumber: 0};
  const view = await mount();
  for (const expected of ['iScope', 'iUnregistered', '#7', '#0', 'Secondary key number']) {
    expect(text(view)).toContain(expected);
  }
});

it('uses the canonical PBaaS signer system for identity lookup and the decrypt command', async () => {
  props = {...props, signerSystemID: otherSystemID, signerSystemName: 'Other Chain'};
  const view = await mount();
  expect(text(view)).toContain('Other Chain');
  await act(async () => onPressOf(button(view, 'Request from requester@, verified'))());
  expect(mockGetIdentity).toHaveBeenCalledWith(otherSystemID, 'iSigner');
  await act(async () => onPressOf(button(view, APPROVE))());
  act(() => onPressOf(button(view, 'View debug information'))());
  expect(text(view)).toContain(`./verus -chain=${otherSystemID} decryptdata`);
});

it.each(['VRSC', 'VRSCTEST'])('preserves the %s daemon command', async chain => {
  const testSystem = toIAddress('VRSCTEST', 'VRSCTEST');
  const signerSystemID = chain === 'VRSC' ? systemID : testSystem;
  mockCoins[signerSystemID] = {id: chain, system_id: signerSystemID};
  props = {...props, signerSystemID, signerSystemName: chain};
  const view = await mount();
  await act(async () => onPressOf(button(view, APPROVE))());
  act(() => onPressOf(button(view, 'View debug information'))());
  expect(text(view)).toContain(chain === 'VRSC'
    ? './verus decryptdata'
    : './verus -chain=vrsctest decryptdata');
});

it.each([false, true])('describes the spending key actually shared (nested=%s)', async nested => {
  props = {...props, returnESK: true, hasDerivationID: nested};
  const view = await mount();
  expect(text(view)).toContain(nested
    ? 'The app can decrypt data, spend funds, and derive more keys. The app-scope key stays private.'
    : 'derive every nested channel for your selected identity, app scope, and primary key number.');
});

it('filters the picker and auto-selects only the required identity', async () => {
  props.request = constrainedRequest([[RecipientConstraint.REQUIRED_ID, otherID]]);
  const view = await mount();
  expect(text(view)).toContain('other@');
  expect(text(view)).not.toContain('user@');
  act(() => onPressOf(button(view, 'Respond as other@'))());
  expect(button(view, 'user@')).toBeUndefined();
  await act(async () => onPressOf(button(view, APPROVE))());
  expect(mockProcess.mock.calls[0][0].responseSignerID).toBe(otherID);
});

it('auto-selects a required system outside the default chain and passes it through approval', async () => {
  props.request = constrainedRequest([[RecipientConstraint.REQUIRED_SYSTEM, otherSystemID]]);
  mockLoadIds.mockResolvedValue({linked_ids: {
    VRSC: {[userID]: 'default-user@'}, OTHER: {[userID]: 'other-chain-user@'},
  }});
  const view = await mount();
  expect(text(view)).toContain('other-chain-user@');
  expect(text(view)).not.toContain('default-user@');
  await act(async () => onPressOf(button(view, APPROVE))());
  expect(mockProcess.mock.calls[0][0]).toMatchObject({
    responseSignerID: userID, responseSignerSystemID: otherSystemID,
  });
});

it('filters parent constraints using the current immediate parent on the selected system', async () => {
  props.request = constrainedRequest([
    [RecipientConstraint.REQUIRED_ID, userID], [RecipientConstraint.REQUIRED_ID, otherID],
    [RecipientConstraint.REQUIRED_SYSTEM, systemID], [RecipientConstraint.REQUIRED_PARENT, parentID],
  ]);
  mockGetIdentity.mockImplementation(async (_, id) => ({
    result: {identity: {parent: id === otherID ? parentID : systemID}},
  }));
  const view = await mount();
  expect(text(view)).toContain('other@');
  expect(text(view)).not.toContain('user@');
  expect(mockGetIdentity).toHaveBeenCalledWith(systemID, otherID);
  expect(mockGetIdentity).toHaveBeenCalledWith(systemID, userID);
  expect(VrpcProvider.initEndpoint).toHaveBeenCalledWith(systemID, 'https://example.com');
});

it('keeps unverified parent records ineligible, even when a linked name suggests a match', async () => {
  const wait = deferred();
  props.request = constrainedRequest([[RecipientConstraint.REQUIRED_PARENT, parentID]]);
  mockLoadIds.mockResolvedValue({linked_ids: {VRSC: {[userID]: 'user.parent@'}}});
  mockGetIdentity.mockReturnValue(wait.promise);
  const view = await mount();
  expect(button(view, APPROVE)).toBeUndefined();
  expect(button(view, 'Choose VerusID')).toBeDefined();
  await act(async () => { wait.resolve({error: {message: 'Lookup failed'}}); });
  expect(button(view, APPROVE)).toBeUndefined();
  expect(text(view)).not.toContain('user.parent@');
});

it('discards stale parent lookups after the signed constraints change', async () => {
  const wait = deferred();
  props.request = constrainedRequest([[RecipientConstraint.REQUIRED_PARENT, parentID]]);
  mockLoadIds.mockResolvedValue({linked_ids: {VRSC: {[userID]: 'user@'}}});
  mockGetIdentity.mockReturnValueOnce(wait.promise).mockResolvedValue({result: {identity: {parent: parentID}}});
  const view = await mount();
  props.request = constrainedRequest([[RecipientConstraint.REQUIRED_PARENT, otherID]]);
  await update(view);
  await act(async () => { wait.resolve({result: {identity: {parent: otherID}}}); });
  expect(button(view, APPROVE)).toBeUndefined();
  expect(text(view)).not.toContain('user@');
});

it('invalidates a retained approval when the selected identity is no longer eligible', async () => {
  const view = await mount();
  const approve = onPressOf(button(view, APPROVE));
  mockLoadIds.mockResolvedValue({linked_ids: {}});
  mockState.services.stored[VERUSID_SERVICE_ID] = {updated: true};
  // A retained approval callback cannot bypass eligibility refresh before render.
  await act(async () => approve());
  expect(mockProcess).not.toHaveBeenCalled();
  expect(props.next).not.toHaveBeenCalled();
  await update(view);
  await act(async () => approve());
  expect(mockProcess).not.toHaveBeenCalled();
  expect(props.next).not.toHaveBeenCalled();
  expect(button(view, APPROVE)).toBeUndefined();
});

it('keeps the response private until the approval completes and prevents duplicate approval', async () => {
  const wait = deferred();
  mockProcess.mockReturnValueOnce(wait.promise);
  const view = await mount();
  const approve = onPressOf(button(view, APPROVE));
  let pending;
  await act(async () => { pending = approve(); await approve(); });
  expect(mockProcess).toHaveBeenCalledTimes(1);
  expect(mockProcess.mock.calls[0][0]).toMatchObject({
    responseSignerID: userID, responseSignerSystemID: systemID, assertActive: expect.any(Function),
  });
  expect(props.next).not.toHaveBeenCalled();
  await act(async () => {
    wait.resolve({
      responseDetail: {encryptedData: 'ciphertext'},
      encryptedDescriptorJson: {objectdata: 'ciphertext'},
    });
    await pending;
  });
  expect(props.response.details).toEqual([]);
  expect(props.next).toHaveBeenCalledTimes(1);
  expect(props.next).toHaveBeenCalledWith(expect.objectContaining({details: [{encryptedData: 'ciphertext'}]}), [0],
    {autoDeliverOnComplete: true, responseIdentityName: 'user@'});
});

it.each(['profile', 'epoch', 'sign-out', 'network', 'deeplink', 'request'])('discards derivation and approval after a %s change', async change => {
  const wait = deferred();
  mockProcess.mockReturnValueOnce(wait.promise);
  const view = await mount();
  const approve = onPressOf(button(view, APPROVE));
  let pending;
  await act(async () => { pending = approve(); });
  const assertActive = mockProcess.mock.calls[0][0].assertActive;
  changeSession(change);
  await update(view);
  expect(assertActive).toThrow('no longer current');
  await act(async () => {
    wait.resolve({responseDetail: {address: 'stale-channel'}});
    await pending;
    await approve();
  });
  expect(props.next).not.toHaveBeenCalled();
  expect(props.response.details).toEqual([]);
  expect(mockAlert).not.toHaveBeenCalled();
  expect(mockProcess).toHaveBeenCalledTimes(1);
});

it.each(['profile', 'epoch', 'sign-out', 'network', 'deeplink', 'request'])('discards a retained approval callback after a %s change', async change => {
  const view = await mount();
  const approve = onPressOf(button(view, APPROVE));
  changeSession(change);
  await update(view);
  await act(async () => approve());
  expect(mockProcess).not.toHaveBeenCalled();
  expect(props.next).not.toHaveBeenCalled();
  expect(props.response.details).toEqual([]);
});

it('invalidates approval when a retained identity-picker callback changes the selected identity', async () => {
  const wait = deferred();
  mockProcess.mockReturnValueOnce(wait.promise);
  const view = await mount();
  const selected = ['user@', 'other@'].find(name => button(view, `Respond as ${name}`));
  act(() => onPressOf(button(view, `Respond as ${selected}`))());
  const selectOther = onPressOf(button(view, selected === 'user@' ? 'other@' : 'user@'));
  let pending;
  await act(async () => { pending = onPressOf(button(view, APPROVE))(); });
  act(() => {
    selectOther();
    // Selection invalidates approval immediately, before React renders the update.
    expect(mockProcess.mock.calls[0][0].assertActive).toThrow('no longer current');
  });
  await act(async () => { wait.resolve({responseDetail: {address: 'stale-channel'}}); await pending; });
  expect(props.next).not.toHaveBeenCalled();
  expect(props.response.details).toEqual([]);
});

it('blocks a stale approval callback immediately when the store changes before a render', async () => {
  const view = await mount();
  const approve = onPressOf(button(view, APPROVE));
  changeSession('profile');
  await act(async () => approve());
  expect(mockProcess).not.toHaveBeenCalled();
  expect(props.next).not.toHaveBeenCalled();
});

it('ignores linked-identity decryption from the previous profile', async () => {
  const wait = deferred();
  mockLoadIds.mockReturnValueOnce(wait.promise).mockResolvedValueOnce({linked_ids: {}});
  const view = await mount();
  changeSession('profile');
  await update(view);
  await act(async () => { wait.resolve({linked_ids: {VRSC: {iOldUser: 'old-user@'}}}); });
  expect(text(view)).not.toContain('old-user@');
  expect(button(view, APPROVE)).toBeUndefined();
});
