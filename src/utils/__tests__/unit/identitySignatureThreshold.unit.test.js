let mockState;
const mockRequestWalletUnlock = jest.fn();
const mockHandleIdentityUpdate = jest.fn();

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  Platform: {OS: 'ios'},
  Dimensions: {get: () => ({width: 390, height: 844})},
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: {create: styles => styles},
}));
jest.mock('react-native-paper', () => ({
  Button: 'Button', Portal: 'Portal', Text: 'Text', Checkbox: {Android: 'Checkbox'},
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../components/SemiModal', () => ({visible, children}) => visible ? children : null);
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/VerusIdDetailsModal/VerusIdDetailsModal', () => 'IdentityModal');
jest.mock('../../../components/ListSelectionModal/ListSelectionModal', () => 'SelectionModal');
jest.mock('../../../components/VdxfUniValueModal/VdxfUniValueModal', () => 'DataModal');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ReviewStep', () => 'ReviewStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ContentStep', () => 'ContentStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ConfirmPayStep', () => 'ConfirmPayStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/components/AuthorityInfoSheet', () => 'AuthorityInfoSheet');
jest.mock('../../../actions/actionDispatchers', () => ({
  requestWalletUnlock: (...args) => mockRequestWalletUnlock(...args),
  WALLET_UNLOCK_CANCELLED: 'WALLET_UNLOCK_CANCELLED',
}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openAuthenticateUserModal: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn(), resolveAlert: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getFriendlyNameMap: jest.fn(), getIdentity: jest.fn()}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: value => value}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));
// GenericRequestHome owns the request session. Its detail handlers read the
// network, so they are stubbed; the identity update review stays real.
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState, subscribe: () => () => {}, dispatch: jest.fn()}}));
jest.mock('verusid-ts-client', () => ({primitives: require('verus-typescript-primitives')}));
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('../../../containers/DeepLink/GenericRequestLoading', () => ({
  __esModule: true, default: 'GenericRequestLoading', GENERIC_REQUEST_LOADING_STEPS: {},
}));
jest.mock('../../deeplink/handlers/identityUpdateRequestDetailsHandler', () => ({
  handleIdentityUpdateRequestDetailsVDXFObject: (...args) => mockHandleIdentityUpdate(...args),
}));
jest.mock('../../deeplink/handlers/authenticationRequestDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/verusPayInvoiceDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/provisionIdentityDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/appEncryptionRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/createWalletBackupDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/spendableKeyDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/userDataRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/dataPacketRequestHandler', () => ({}));
jest.mock('../../deeplink/isDeeplinkHandlerInstalled', () => ({isDeeplinkHandlerInstalled: async () => false}));
jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({markPendingDeeplinkComplete: jest.fn()}));
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoiceInfo', () => 'InvoiceInfo');
jest.mock('../../../containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo', () => 'AuthenticationRequestInfo');
jest.mock('../../../containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo', () => 'AppEncryptionRequestInfo');
jest.mock('../../../containers/DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo', () => 'WalletBackupRequestInfo');
jest.mock('../../../containers/DeepLink/SpendableKeyRequestInfo/SpendableKeyRequestInfo', () => 'SpendableKeyRequestInfo');
jest.mock('../../../containers/DeepLink/UserDataRequestInfo/UserDataRequestInfo', () => 'UserDataRequestInfo');
jest.mock('../../../containers/DeepLink/DataPacketRequestInfo/DataPacketRequestInfo', () => 'DataPacketRequestInfo');

const React = require('react');
const {act, create} = require('react-test-renderer');
const AppButton = require('../../../components/AppButton').default;
const IdentityUpdateRequestInfo = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo').default;
const GenericRequestHome = require('../../../containers/DeepLink/GenericRequestHome/GenericRequestHome').default;
const {ContentMultiMapRemoveKey, DataStringKey, GenericRequest, IDENTITY_CREDENTIAL, IdentityUpdateRequestDetails, IdentityUpdateRequestOrdinalVDXFObject, KvMap, PartialIdentity, PartialSignData} = require('verus-typescript-primitives');
const {VERUSID_CMM_INFO, VERUSID_CMM_DATA} = require('../../constants/verusidObjectData');
const {createAlert} = require('../../../actions/actions/alert/dispatchers/alert');

const OWN_ADDRESS = 'RWCqoWfSKaDoGeiwD6ZxX2dwkMx2oHJM56';
const OTHER_ADDRESS = 'RKDPtS54bX89AacDfkHBUm46YoxahHjkCw';
const currentIdentity = {
  primaryaddresses: [OWN_ADDRESS, OTHER_ADDRESS], minimumsignatures: 1,
  recoveryauthority: 'current-recovery', revocationauthority: 'current-revocation',
  flags: 0, timelock: 0, contentmultimap: {},
};
const requestEnvelope = (name = 'T1') => new GenericRequest({details: [new IdentityUpdateRequestOrdinalVDXFObject({
  data: IdentityUpdateRequestDetails.fromCLIJson({name, parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'}),
})]});
// The handler output for one request: what GenericRequestHome passes on to
// the identity update review.
const handledRequest = (updates, extra = {}) => (request, response) => Promise.resolve({
  response,
  handledIndices: [],
  displayProps: {
    subjectIdentity: {fullyqualifiedname: 'T1@', identity: currentIdentity},
    subjectIdentityContent: {fullyqualifiedname: 'T1@', identity: currentIdentity},
    identityUpdates: updates,
    identityPreviewPrepared: false,
    friendlyNames: {},
    coinObj: {id: 'VRSC', mainnet_id: 'VRSC', seconds_per_block: 60},
    chainInfo: {blocks: 100},
    sigtime: 1,
    ...extra,
  },
});
const homeProps = {navigation: {navigate: jest.fn(), addListener: () => () => {}, isFocused: () => true}, cancel: jest.fn(), setLoading: jest.fn()};
// A new deeplink replaces the request: GenericRequestHome keys its session by
// the request data, so the old review unmounts and the new one starts fresh.
const renderHome = async name => {
  let renderer;
  await act(async () => {
    renderer = create(<GenericRequestHome {...homeProps} deeplinkData={requestEnvelope(name).toBuffer().toString('hex')} />);
  });
  return renderer;
};
const replaceHomeRequest = (renderer, name) => act(async () => {
  renderer.update(<GenericRequestHome {...homeProps} deeplinkData={requestEnvelope(name).toBuffer().toString('hex')} />);
});
const renderRequest = (updates, identity = currentIdentity, props = {}) => {
  let renderer;
  act(() => {
    renderer = create(<IdentityUpdateRequestInfo
      subjectIdentity={{fullyqualifiedname: 'T1@', identity}}
      subjectIdentityContent={{fullyqualifiedname: 'T1@', identity}}
      identityUpdates={updates}
      identityPreviewPrepared={false}
      friendlyNames={{}}
      coinObj={{id: 'VRSC', mainnet_id: 'VRSC', seconds_per_block: 60}}
      chainInfo={{blocks: 100}}
      sigtime={1}
      requestBufferString={requestEnvelope().toBuffer().toString('hex')}
      {...props}
    />);
  });
  return renderer;
};
const FOOTER_LABELS = ['Review changes', 'Unlock wallet', 'Switch wallet', 'Next', 'Continue'];
const nextButton = renderer => renderer.root.findAllByType(AppButton)
  .find(node => FOOTER_LABELS.includes(node.props.children));
const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.filter(child => typeof child === 'string').join('')).join(' ');
const advanceTo = (renderer, reached) => {
  // Review, then Content when it has changes, then high-risk review, then confirmation.
  for (let step = 0; step < 3 && !reached(); step += 1) act(() => nextButton(renderer).props.onPress());
};
const goToRiskReview = renderer => advanceTo(renderer, () => nextButton(renderer).props.children === 'Continue');
const goToConfirm = renderer => advanceTo(renderer, () => renderer.root.findAllByType('ConfirmPayStep').length > 0);
const goToContent = renderer => {
  act(() => nextButton(renderer).props.onPress());
  return renderer.root.findByType('ContentStep').props;
};
// The review step shows its counts as "1 high-risk" and "2 content".
const reviewCounts = renderer => {
  const summary = create(renderer.root.findByType('ReviewStep').props.reviewDetails);
  const text = renderedText(summary);
  summary.unmount();
  return {
    highRisk: Number((text.match(/(\d+) high-risk/) || [])[1] || 0),
    content: Number((text.match(/(\d+) content/) || [])[1] || 0),
  };
};
// Continue opens the acknowledgement sheet; I understand acknowledges and moves on.
const understand = renderer => renderer.root.findAllByType(AppButton).find(node => node.props.children === 'I understand');
const acknowledgeRisks = renderer => {
  act(() => nextButton(renderer).props.onPress());
  act(() => understand(renderer).props.onPress());
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    authentication: {
      signedIn: true,
      accounts: [],
      activeAccount: {testnetOverrides: {}, keys: {VRSC: {vrpc: {addresses: [OWN_ADDRESS]}}}},
    },
    sendModal: {type: null},
    modal: {stack: []},
    deeplink: {passthrough: {}, requestId: 1},
    settings: {generalWalletSettings: {enableExperimentalGenericRequests: true}},
  };
});

describe('private address removal review', () => {
  const privateAddress = 'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa';
  const removalDetails = () => {
    const details = IdentityUpdateRequestDetails.fromCLIJson({name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'});
    details.identity.privateAddresses = [];
    details.identity.contains = details.identity.contains.or(PartialIdentity.PARTIAL_ID_CONTAINS_PRIV_ADDRS);
    return details.toBuffer().toString('hex');
  };

  it.each([false, true])('shows removal and requires acknowledgement (credential preview: %s)', hasEncryptedKeys => {
    const identity = {...currentIdentity, privateaddress: privateAddress};
    // Credential previews retain the old scalar value; prepared previews omit it.
    const updates = hasEncryptedKeys ? identity : {...currentIdentity};
    const renderer = renderRequest(updates, identity, {
      detailsBufferString: removalDetails(), hasEncryptedKeys,
      identityPreviewPrepared: !hasEncryptedKeys,
    });
    expect(reviewCounts(renderer).highRisk).toBe(1);
    // A private address change has no Content step; the high-risk step shows both values.
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);

    goToRiskReview(renderer);
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    expect(renderedText(renderer)).toContain('Remove private (Z) address');
    expect(renderedText(renderer)).toContain(privateAddress);
    expect(renderedText(renderer)).toContain(`Current ${privateAddress}`);
    expect(renderedText(renderer)).toContain('After update No private address');
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    expect(understand(renderer)).toBeDefined();
    act(() => understand(renderer).props.onPress());
    expect(renderer.root.findByType('ConfirmPayStep').props.highRiskCount).toBe(1);
    renderer.unmount();
  });

  it.each([{}, {privateaddress: privateAddress}])('does not report removal for an omitted or unchanged address: %p', updates => {
    const details = IdentityUpdateRequestDetails.fromCLIJson({name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', ...updates});
    const renderer = renderRequest(updates, {...currentIdentity, privateaddress: privateAddress}, {
      detailsBufferString: details.toBuffer().toString('hex'),
    });
    expect(reviewCounts(renderer).highRisk).toBe(0);
    renderer.unmount();
  });

  it('does not report removal when the identity has no private address', () => {
    const renderer = renderRequest(currentIdentity, currentIdentity, {detailsBufferString: removalDetails()});
    expect(reviewCounts(renderer).highRisk).toBe(0);
    renderer.unmount();
  });

  it.each([undefined, 'zsPreviousAddress'])('keeps additions and replacements visible (current: %s)', previous => {
    const renderer = renderRequest({privateaddress: privateAddress}, {...currentIdentity, privateaddress: previous});
    expect(reviewCounts(renderer).highRisk).toBe(1);
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain(`After update ${privateAddress}`);
    expect(renderedText(renderer)).not.toContain('After update No private address');
    renderer.unmount();
  });
});

describe('identity signature-threshold review', () => {
  it('returns to review and requires a new acknowledgement when the request changes', async () => {
    mockHandleIdentityUpdate
      .mockImplementationOnce(handledRequest({minimumsignatures: 2}))
      .mockImplementationOnce(handledRequest({minimumsignatures: 2, recoveryauthority: 'replacement-recovery'}));
    const renderer = await renderHome('T1');
    goToRiskReview(renderer);
    acknowledgeRisks(renderer);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    await replaceHomeRequest(renderer, 'T2');
    expect(mockHandleIdentityUpdate).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    expect(renderer.root.findAllByType('ReviewStep')).toHaveLength(1);
    goToRiskReview(renderer);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    expect(understand(renderer)).toBeDefined();
    // The acknowledgement covers the replacement's own recovery change.
    expect(renderedText(renderer)).toContain('New recovery ID replacement-recovery');
    renderer.unmount();
  });

  it('reviews a public upload even when credential encryption deferred its preview reference', () => {
    const details = IdentityUpdateRequestDetails.fromCLIJson({name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[DataStringKey.vdxfid]: {data: {message: 'public payload'}}},
    });
    const renderer = renderRequest({contentmultimap: {[IDENTITY_CREDENTIAL.vdxfid]: []}}, currentIdentity, {
      detailsBufferString: details.toBuffer().toString('hex'), hasEncryptedKeys: true,
    });
    expect(reviewCounts(renderer).content).toBe(1);
    const content = goToContent(renderer);
    const upload = content.displayUpdates[VERUSID_CMM_INFO.key][`${VERUSID_CMM_DATA.key}:${DataStringKey.vdxfid}:upload`];
    expect(upload).toMatchObject({isEncrypted: false, contentKey: DataStringKey.vdxfid});
    expect(upload.signData.data.toString('utf8')).toBe('public payload');
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    renderer.unmount();
  });

  it('shows complete requested values on the first screen and excludes generated preview references', () => {
    const values = [
      {[DataStringKey.vdxfid]: 'First requested value'},
      {[DataStringKey.vdxfid]: 'Second requested value that must not be hidden'},
    ];
    const details = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[DataStringKey.vdxfid]: values},
    });
    const before = details.toBuffer().toString('hex');
    const renderer = renderRequest({contentmultimap: {
      [DataStringKey.vdxfid]: [{[DataStringKey.vdxfid]: 'preview-only reference'}],
      [IDENTITY_CREDENTIAL.vdxfid]: [{[DataStringKey.vdxfid]: 'another generated reference'}],
    }}, currentIdentity, {detailsBufferString: before});
    const updates = goToContent(renderer).displayUpdates[VERUSID_CMM_INFO.key];
    expect(Object.keys(updates)).toHaveLength(1);
    expect(updates[`${VERUSID_CMM_DATA.key}:${DataStringKey.vdxfid}`].rawData).toEqual(values);
    expect(JSON.stringify(updates)).not.toContain('preview-only reference');
    expect(JSON.stringify(updates)).not.toContain('another generated reference');
    expect(details.toBuffer().toString('hex')).toBe(before);
    renderer.unmount();
  });

  it('does not mask ordinary values when an upload uses the same content key', () => {
    // The SDK rejects overlapping keys before submission. Review must still show
    // every requested payload when credential encryption defers preparation.
    const values = [{[DataStringKey.vdxfid]: 'Visible ordinary content'}];
    const details = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[DataStringKey.vdxfid]: values},
    });
    details.signDataMap = new KvMap();
    details.signDataMap.setByAddress(DataStringKey.vdxfid,
      PartialSignData.fromCLIJson({message: 'Visible upload content'}));
    details.toggleContainsSignData();
    const renderer = renderRequest({}, currentIdentity, {
      detailsBufferString: details.toBuffer().toString('hex'), hasEncryptedKeys: true,
    });
    const updates = goToContent(renderer).displayUpdates[VERUSID_CMM_INFO.key];
    const key = `${VERUSID_CMM_DATA.key}:${DataStringKey.vdxfid}`;
    expect(Object.keys(updates)).toHaveLength(2);
    expect(updates[key].rawData).toEqual(values);
    expect(updates[`${key}:upload`].signData.data.toString('utf8')).toBe('Visible upload content');
    renderer.unmount();
  });

  it('keeps clearing all content visible on the first screen and requires the risk acknowledgement', () => {
    const details = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[ContentMultiMapRemoveKey.vdxfid]: [{
        [ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 4},
      }]},
    });
    const renderer = renderRequest({}, {
      ...currentIdentity, contentmultimap: {[DataStringKey.vdxfid]: ['Current content']},
    }, {detailsBufferString: details.toBuffer().toString('hex')});
    expect(reviewCounts(renderer)).toEqual({highRisk: 1, content: 0});
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain('Will clear All active content 1 key, 1 value.');
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    act(() => understand(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    renderer.unmount();
  });

  it('reviews data recorded under the removal key even when it is not a removal instruction', () => {
    const values = [{[DataStringKey.vdxfid]: 'This statement is still recorded in the identity update.'}];
    const details = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[ContentMultiMapRemoveKey.vdxfid]: values},
    });
    const renderer = renderRequest({}, currentIdentity, {
      detailsBufferString: details.toBuffer().toString('hex'),
    });
    expect(reviewCounts(renderer)).toEqual({highRisk: 0, content: 1});
    const updates = goToContent(renderer).displayUpdates[VERUSID_CMM_INFO.key];

    expect(Object.keys(updates)).toHaveLength(1);
    expect(updates[`${VERUSID_CMM_DATA.key}:${ContentMultiMapRemoveKey.vdxfid}:unrecognized`])
      .toMatchObject({
        unrecognizedRemoval: true,
        contentKey: ContentMultiMapRemoveKey.vdxfid,
        rawData: values,
        displayTitle: 'Unrecognized removal data',
      });
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findByType('ConfirmPayStep').props.contentCount).toBe(1);
    renderer.unmount();
  });

  it('keeps recognized removal actions and other recorded data under the removal key separate', () => {
    const ignored = {[DataStringKey.vdxfid]: 'Additional data recorded alongside the removal'};
    const removal = {[ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 4}};
    const details = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[ContentMultiMapRemoveKey.vdxfid]: [ignored, removal]},
    });
    const renderer = renderRequest({}, currentIdentity, {
      detailsBufferString: details.toBuffer().toString('hex'),
    });
    expect(reviewCounts(renderer)).toEqual({highRisk: 1, content: 1});
    const updates = goToContent(renderer).displayUpdates[VERUSID_CMM_INFO.key];

    expect(Object.values(updates)).toEqual(expect.arrayContaining([
      expect.objectContaining({unrecognizedRemoval: true, rawData: [ignored]}),
      expect.objectContaining({removeMeta: expect.objectContaining({action: 4}), rawData: [removal]}),
    ]));
    expect(Object.keys(updates)).toHaveLength(2);
    goToRiskReview(renderer);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    renderer.unmount();
  });

  it('returns a replacement content request to its own first-screen review', async () => {
    const makeDetails = message => IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      contentmultimap: {[DataStringKey.vdxfid]: {data: {message}}},
    }).toBuffer().toString('hex');
    mockHandleIdentityUpdate
      .mockImplementationOnce(handledRequest({}, {detailsBufferString: makeDetails('Old request')}))
      .mockImplementationOnce(handledRequest({}, {detailsBufferString: makeDetails('Replacement request')}));
    const renderer = await renderHome('T1');
    goToConfirm(renderer);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    await replaceHomeRequest(renderer, 'T2');
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    expect(renderer.root.findAllByType('ReviewStep')).toHaveLength(1);
    const updates = goToContent(renderer).displayUpdates[VERUSID_CMM_INFO.key];
    expect(Object.values(updates)).toHaveLength(1);
    expect(Object.values(updates)[0].signData.data.toString('utf8')).toBe('Replacement request');
    renderer.unmount();
  });

  it('shows how long an expiring request stays valid in the requester sheet', () => {
    // The request card passes these sections to its requester sheet.
    const sheetRows = renderer => renderer.root.findByType('ReviewStep').props.requestCard
      .props.sections.flatMap(section => section.rows);
    // The identity update handler passes the request details as a buffer.
    // Height 130 at chain height 100 is 30 blocks of 60 seconds.
    const expiring = IdentityUpdateRequestDetails.fromCLIJson({name: 'T1', parent: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'}, {expiryheight: 130});
    const renderer = renderRequest({}, currentIdentity, {detailsBufferString: expiring.toBuffer().toString('hex')});
    expect(sheetRows(renderer)).toContainEqual({label: 'Expires', value: '30 minutes'});
    renderer.unmount();

    const lasting = renderRequest({});
    expect(sheetRows(lasting).map(row => row.label)).not.toContain('Expires');
    lasting.unmount();
  });

  it('preserves the generic request network through final confirmation', () => {
    mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
    const request = requestEnvelope();
    request.setIsTestnet();
    const renderer = renderRequest({}, currentIdentity, {requestBufferString: request.toBuffer().toString('hex')});
    expect(nextButton(renderer).props.disabled).toBe(false);
    goToConfirm(renderer);
    expect(renderer.root.findByType('ConfirmPayStep').props.requestIsTestnet).toBe(true);
    expect(createAlert).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it('does not advance a replacement review when an earlier sign-in prompt completes', async () => {
    mockState.authentication.signedIn = false;
    mockState.authentication.accounts = [{testnetOverrides: {}}];
    let finishUnlock;
    mockRequestWalletUnlock.mockReturnValueOnce(new Promise(resolve => { finishUnlock = resolve; }));
    mockHandleIdentityUpdate
      .mockImplementationOnce(handledRequest({minimumsignatures: 2}))
      .mockImplementationOnce(handledRequest({minimumsignatures: 2, recoveryauthority: 'new-recovery'}));
    const renderer = await renderHome('T1');
    act(() => nextButton(renderer).props.onPress());
    expect(mockRequestWalletUnlock).toHaveBeenCalledTimes(1);
    await replaceHomeRequest(renderer, 'T2');
    expect(renderer.root.findAllByType('ReviewStep')).toHaveLength(1);
    // The unlock from the replaced review finishes late.
    mockState.authentication.signedIn = true;
    await act(async () => finishUnlock({}));
    expect(renderer.root.findAllByType('ReviewStep')).toHaveLength(1);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    expect(renderedText(renderer)).not.toContain('Understand high-risk changes');
    renderer.unmount();
  });

  it.each([false, true])('requires review and acknowledgement when only the threshold changes (partial: %s)', partial => {
    const updates = partial ? {minimumsignatures: 2} : {...currentIdentity, minimumsignatures: 2};
    const renderer = renderRequest(updates);
    expect(reviewCounts(renderer)).toEqual({highRisk: 1, content: 0});

    goToRiskReview(renderer);
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    expect(renderedText(renderer)).toContain('Required signatures 1 of 2 → 2 of 2');
    expect(renderedText(renderer)).toContain('Spending, signing, and ordinary VerusID updates need these signatures.');
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);

    act(() => nextButton(renderer).props.onPress());
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 2 → 2 of 2');
    expect(renderedText(renderer)).toContain('After this update, your wallet cannot authorize this VerusID alone.');
    expect(renderedText(renderer)).toContain('Primary addresses in this wallet 1');
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);

    act(() => understand(renderer).props.onPress());
    expect(renderer.root.findByType('ConfirmPayStep').props.highRiskCount).toBe(1);
    renderer.unmount();
  });

  it('shows a reduced threshold and recognizes enough wallet keys', () => {
    const renderer = renderRequest({minimumsignatures: 1}, {...currentIdentity, minimumsignatures: 2});
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain('Required signatures 2 of 2 → 1 of 2');
    act(() => nextButton(renderer).props.onPress());
    expect(renderedText(renderer)).toContain('Required signatures: 2 of 2 → 1 of 2');
    expect(renderedText(renderer)).toContain('Your wallet can still authorize this VerusID alone.');
    expect(renderedText(renderer)).not.toContain('Your wallet will need additional signatures after this update');
    renderer.unmount();
  });

  it('counts the updated primary addresses when the address list changes too', () => {
    const renderer = renderRequest(
      {primaryaddresses: [OWN_ADDRESS, OTHER_ADDRESS], minimumsignatures: 2},
      {...currentIdentity, primaryaddresses: [OWN_ADDRESS]},
    );
    goToRiskReview(renderer);
    act(() => nextButton(renderer).props.onPress());
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 1 → 2 of 2');
    expect(renderedText(renderer)).toContain('Primary address added');
    expect(renderedText(renderer)).toContain('Your wallet will need additional signatures after this update');
    renderer.unmount();
  });

  it('keeps the threshold visible alongside authority and timelock changes', () => {
    const renderer = renderRequest({minimumsignatures: 2, recoveryauthority: 'new-recovery', flags: 2, timelock: 20});
    goToRiskReview(renderer);
    act(() => nextButton(renderer).props.onPress());
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 2 → 2 of 2');
    expect(renderedText(renderer)).toContain('New recovery ID new-recovery');
    expect(renderedText(renderer)).toContain('Lock identity funds');
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);
    renderer.unmount();
  });

  // Ported from the ContentStep case "omits the section when there are no
  // content changes (undefined)": the parent leaves the Content step out.
  it('omits the content step when the request has no content changes', () => {
    const renderer = renderRequest({});
    expect(reviewCounts(renderer).content).toBe(0);
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    renderer.unmount();
  });

  it.each([{}, {minimumsignatures: 1}])('does not invent a threshold change when omitted or unchanged: %p', updates => {
    const renderer = renderRequest(updates);
    expect(reviewCounts(renderer).highRisk).toBe(0);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    renderer.unmount();
  });
});
