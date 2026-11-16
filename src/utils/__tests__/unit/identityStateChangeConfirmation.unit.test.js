const mockCreateUpdateIdentityTx = jest.fn();
const mockPushUpdateIdentityTx = jest.fn();
const mockSubmitReviewedIdentityUpdate = jest.fn();
const mockValidateIdentityUpdateContext = jest.fn(async () => 100);
let mockState;

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  ActivityIndicator: 'ActivityIndicator',
  Alert: {alert: jest.fn()},
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({Button: 'Button', Portal: 'Portal', Text: 'Text'}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-navigation/native', () => {
  const navigation = {isFocused: () => true, addListener: () => jest.fn(), getParent: () => undefined};
  return {useNavigation: () => navigation};
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));
jest.mock('react-native-format-currency', () => ({formatCurrency: jest.fn()}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/SemiModal', () => ({visible, children}) => visible ? children : null);
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {}}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => null}}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  getUpdateIdentityFeeSats: jest.requireActual('../../api/channels/verusid/requests/updateIdentity').getUpdateIdentityFeeSats,
  createUpdateIdentityTx: mockCreateUpdateIdentityTx,
  pushUpdateIdentityTx: mockPushUpdateIdentityTx,
}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));
jest.mock('../../identityUpdate/localUploadCrypto', () => ({
  createLocalIdentityUploadCrypto: jest.fn(async () => ({decryptData: jest.fn(), dispose: jest.fn()})),
}));
jest.mock('../../identityUpdate/verifiedSubmission', () => ({
  captureIdentityUpdateContext: options => options,
  assertIdentityUpdateContext: jest.fn(),
  requireIdentityFundingApproval: built => {
    if (!built.fundingApproval) throw new Error('Missing verified identity funding approval');
    return built.fundingApproval;
  },
  validateIdentityUpdateContext: mockValidateIdentityUpdateContext,
  submitReviewedIdentityUpdate: mockSubmitReviewedIdentityUpdate,
}));
jest.mock('../../crypto/encryptCredentials', () => ({
  ...jest.requireActual('../../crypto/encryptCredentials'),
  processEncryptedKeys: jest.fn(),
}));
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
const {processEncryptedKeys} = require('../../crypto/encryptCredentials');
const {createLocalIdentityUploadCrypto} = require('../../identityUpdate/localUploadCrypto');
const {requestPrivKey} = require('../../auth/authBox');
const AppButton = require('../../../components/AppButton').default;
const CopyAction = require('../../../components/CopyAction').default;
const SlideToConfirm = require('../../../components/SlideToConfirm').default;

const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.join('')).join(' ');

const setup = (builtOverrides = {}, props = {}) => {
  const coinObj = {id: 'VRSC', system_id: 'currency-id', currency_id: 'currency-id', display_ticker: 'VRSC', seconds_per_block: 60};
  const wallet = {
    id: 'wallet',
    name: 'Test payment wallet',
    network: 'VRSC',
    channel: 'vrpc.payment-address.currency-id',
    api_channels: {get_balances: 'vrpc', send: 'vrpc.payment-address.currency-id'},
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
  const details = {containsSystem: () => true, containsRequestID: () => false, systemID: {toAddress: () => 'currency-id'}};
  const preview = buildIdentityStateChange({
    currentIdentity: subjectIdentity.identity,
    updatedIdentity: {flags: 0, timelock: 140},
    chainHeight: 100,
    secondsPerBlock: 60,
  });
  const built = {
    identity: {toJson: () => ({flags: 0, timelock: 160})},
    deltas: new Map([['currency-id', BigNumber(-10000)]]),
    hex: 'funded-transaction',
    utxos: [{txid: 'identity-input'}, {txid: 'funding-input'}],
    fundingApproval: {nativeFee: '10000'},
    ...builtOverrides,
  };
  mockCreateUpdateIdentityTx.mockResolvedValue(built);

  let renderer;
  act(() => { renderer = create(
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
      cancel={jest.fn()}
      {...props}
    />,
  ); });
  return {renderer, details, built};
};
const appButton = (renderer, label) => renderer.root.findAllByType(AppButton).find(node => node.props.children === label);
const slide = renderer => renderer.root.findByType(SlideToConfirm);
const openSources = renderer => act(() => appButton(renderer, 'Select payment source').props.onPress());
const walletRow = renderer => renderer.root.findAllByType('TouchableOpacity').find(node =>
  node.findAllByType('Text').some(text => text.children.includes('Test payment wallet')),
);
const selectSource = async renderer => {
  openSources(renderer);
  await act(async () => walletRow(renderer).props.onPress());
};
beforeEach(() => {
  jest.clearAllMocks();
  mockValidateIdentityUpdateContext.mockResolvedValue(100);
  mockSubmitReviewedIdentityUpdate.mockReset();
});

it('reviews the funded transaction unlock height before enabling the update', async () => {
  const {renderer, details} = setup();
  expect(renderedText(renderer)).toContain('Timelock: 140');
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);

  await selectSource(renderer);

  expect(mockCreateUpdateIdentityTx).toHaveBeenCalledWith(
    'currency-id', details, 'payment-address', 'previous-transaction', 90, true, false, undefined, 100,
  );
  expect(renderedText(renderer)).toContain('Timelock: 160');
  expect(renderedText(renderer)).toContain('spending from block 161');
  expect(renderedText(renderer)).not.toContain('Timelock: 140');
  expect(slide(renderer).props.disabled).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockPushUpdateIdentityTx).not.toHaveBeenCalled();
  renderer.unmount();
});

it('rejects a funded response without its original approval before enabling signing', async () => {
  const {renderer} = setup({fundingApproval: undefined});
  await selectSource(renderer);
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  expect(renderedText(renderer)).toContain('The fee could not be calculated. Select a payment source again.');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockSubmitReviewedIdentityUpdate).not.toHaveBeenCalled();
  renderer.unmount();
});

it('does not display a usable review when the chain or expiry changes during preparation', async () => {
  const {renderer} = setup();
  mockValidateIdentityUpdateContext.mockResolvedValueOnce(100).mockRejectedValueOnce(
    Object.assign(new Error('This identity update request has expired.'), {code: 'REVIEW_CHANGED'}),
  );
  await selectSource(renderer);
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  expect(renderedText(renderer)).toContain('This review is out of date. Close the request and open it again.');
  expect(Alert.alert).not.toHaveBeenCalled();
  renderer.unmount();
});

it('preserves credential encryption before funding and forwards the complete local crypto adapter', async () => {
  const {renderer} = setup({}, {hasEncryptedKeys: true});
  const encrypted = {signDataMap: {size: 1}};
  const callback = jest.fn();
  processEncryptedKeys.mockResolvedValue(encrypted);
  const crypto = {decryptData: callback, dispose: jest.fn()};
  createLocalIdentityUploadCrypto.mockResolvedValue(crypto);
  await selectSource(renderer);
  expect(mockCreateUpdateIdentityTx).toHaveBeenCalledWith(
    'currency-id', encrypted, 'payment-address', 'previous-transaction', 90, true, false, crypto, 100,
  );
  expect(processEncryptedKeys.mock.invocationCallOrder[0]).toBeLessThan(mockCreateUpdateIdentityTx.mock.invocationCallOrder[0]);
  expect(crypto.dispose).toHaveBeenCalledTimes(1);
  expect(createLocalIdentityUploadCrypto).toHaveBeenCalledWith({
    systemId: 'currency-id', request: encrypted, assertActive: expect.any(Function),
  });
  renderer.unmount();
});

it('keeps the approved inputs and session-bound keys but cannot resend after uncertain delivery', async () => {
  const cancel = jest.fn();
  const {renderer, built, details} = setup({}, {cancel});
  await selectSource(renderer);
  mockSubmitReviewedIdentityUpdate.mockRejectedValueOnce(Object.assign(new Error('Delivery unconfirmed'), {
    code: 'BROADCAST_UNKNOWN', txid: 'ab'.repeat(32),
  }));
  const send = slide(renderer).props.onPress;
  await act(async () => send());
  await act(async () => send());
  expect(mockSubmitReviewedIdentityUpdate).toHaveBeenCalledTimes(1);
  const attempt = mockSubmitReviewedIdentityUpdate.mock.calls[0][0];
  expect(attempt.built).toBe(built);
  expect(attempt.context).toMatchObject({
    systemId: 'currency-id', request: details, changeAddress: 'payment-address',
    identityAddress: 'identity-address', isTestnet: false,
  });
  requestPrivKey.mockResolvedValue('private-key');
  expect(await attempt.getKeys()).toEqual([['private-key'], ['private-key']]);
  expect(requestPrivKey).toHaveBeenCalledWith('VRSC', 'vrpc', attempt.context);
  expect(renderedText(renderer)).toContain('Delivery not confirmed');
  expect(renderedText(renderer)).toContain(`${'ab'.repeat(5)}...${'ab'.repeat(5)}`);
  expect(renderer.root.findByType(CopyAction).props.value).toBe('ab'.repeat(32));
  expect(renderedText(renderer)).toContain('Check the transaction status before you start a new review.');
  expect(appButton(renderer, 'Try again')).toBeUndefined();
  await act(async () => appButton(renderer, 'Close').props.onPress());
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(mockCreateUpdateIdentityTx).toHaveBeenCalledTimes(1);
  expect(mockPushUpdateIdentityTx).not.toHaveBeenCalled();
  renderer.unmount();
});

it('does not expose another payment after a response callback fails following successful broadcast', async () => {
  const next = jest.fn(async () => {throw new Error('Response failed');});
  const {renderer} = setup({}, {next});
  await selectSource(renderer);
  mockSubmitReviewedIdentityUpdate.mockResolvedValueOnce({txid: 'ab'.repeat(32)});
  const send = slide(renderer).props.onPress;
  await act(async () => send());
  await act(async () => send());
  expect(mockSubmitReviewedIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(renderedText(renderer)).toContain('Identity update broadcast');
  expect(next).not.toHaveBeenCalled();
  await act(async () => appButton(renderer, 'Complete').props.onPress());
  await act(async () => send());
  expect(next).toHaveBeenCalledTimes(1);
  expect(mockSubmitReviewedIdentityUpdate).toHaveBeenCalledTimes(1);
  expect(renderedText(renderer)).toContain('Response not sent');
  expect(renderedText(renderer)).toContain('Response failed');
  expect(appButton(renderer, 'Complete')).toBeUndefined();
  renderer.unmount();
});

it('disposes local upload keys on funding errors and cancellation while an upload is pending', async () => {
  const details = {containsSystem: () => true, systemID: {toAddress: () => 'currency-id'}, signDataMap: {size: 1}};
  const crypto = {decryptData: jest.fn(), dispose: jest.fn()};
  createLocalIdentityUploadCrypto.mockResolvedValue(crypto);
  const first = setup({}, {details});
  mockCreateUpdateIdentityTx.mockRejectedValueOnce(new Error('Funding rejected'));
  await selectSource(first.renderer);
  expect(crypto.dispose).toHaveBeenCalledTimes(1);
  expect(first.renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  first.renderer.unmount();

  let finish;
  const second = setup({}, {details});
  mockCreateUpdateIdentityTx.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let pending;
  openSources(second.renderer);
  act(() => { pending = walletRow(second.renderer).props.onPress(); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  act(() => second.renderer.unmount());
  expect(crypto.dispose).toHaveBeenCalledTimes(2);
  const activityCheck = createLocalIdentityUploadCrypto.mock.calls[1][0].assertActive;
  expect(activityCheck).toThrow('canceled');
  await act(async () => { finish(second.built); await pending; });
  expect(mockSubmitReviewedIdentityUpdate).not.toHaveBeenCalled();
});

it('shows the exact funded ownership policy together with its actual fee', async () => {
  const {renderer} = setup({
    identity: {toJson: () => ({flags: 0, timelock: 160, primaryaddresses: ['final-first-owner', 'final-second-owner'], minimumsignatures: 2, recoveryauthority: 'final-recovery', revocationauthority: 'final-revocation'})},
    fundingApproval: {nativeFee: '12345678'},
  });
  await selectSource(renderer);
  expect(renderedText(renderer)).toContain('0.12345678 VRSC');
  act(() => renderer.root.findAllByType('TouchableOpacity').find(node =>
    node.props.accessibilityLabel === 'Keys and authorities, Changed').props.onPress());
  expect(renderedText(renderer)).toContain('Primary addresses Current None After update final-first-owner\nfinal-second-owner');
  expect(renderedText(renderer)).toContain('Required signatures Current None After update 2');
  renderer.unmount();
});

it('invalidates a funded review when the mounted screen receives a different request', async () => {
  const {renderer, details} = setup();
  await selectSource(renderer);
  expect(slide(renderer).props.disabled).toBe(false);
  const previousProps = renderer.root.findByType(ConfirmPayStep).props;
  const replacement = {...details, containsRequestID: () => true, requestID: {toAddress: () => 'different-request'}};
  act(() => renderer.update(<ConfirmPayStep {...previousProps} details={replacement} />));
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  expect(mockSubmitReviewedIdentityUpdate).not.toHaveBeenCalled();
  renderer.unmount();
});

it('discards an upload build that completes after the source identity changes', async () => {
  const details = {containsSystem: () => true, systemID: {toAddress: () => 'currency-id'}, signDataMap: {size: 1}};
  const crypto = {decryptData: jest.fn(), dispose: jest.fn()};
  createLocalIdentityUploadCrypto.mockResolvedValue(crypto);
  const {renderer, built} = setup({}, {details});
  let finish;
  mockCreateUpdateIdentityTx.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  openSources(renderer);
  let pending;
  act(() => { pending = walletRow(renderer).props.onPress(); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  const previousProps = renderer.root.findByType(ConfirmPayStep).props;
  act(() => renderer.update(<ConfirmPayStep {...previousProps} subjectIdTxHex="new-source-identity-transaction" />));
  expect(crypto.dispose).toHaveBeenCalled();
  await act(async () => { finish(built); await pending; });
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  expect(mockSubmitReviewedIdentityUpdate).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  renderer.unmount();
});

it('revokes the signing context when the confirmation is left during a key prompt', async () => {
  const {renderer} = setup();
  await selectSource(renderer);
  let releaseKey;
  requestPrivKey.mockImplementationOnce(() => new Promise(resolve => { releaseKey = resolve; }));
  let signed = false;
  mockSubmitReviewedIdentityUpdate.mockImplementationOnce(async ({context, getKeys}) => {
    await getKeys();
    if (context.signal.aborted) throw Object.assign(new Error('Canceled signing'), {code: 'SESSION_CHANGED'});
    signed = true;
    return {txid: 'ab'.repeat(32)};
  });
  let pending;
  act(() => { pending = slide(renderer).props.onPress(); });
  const attempt = mockSubmitReviewedIdentityUpdate.mock.calls[0][0];
  expect(attempt.context.signal.aborted).toBe(false);
  act(() => renderer.unmount());
  expect(attempt.context.signal.aborted).toBe(true);
  await act(async () => { releaseKey('wallet-key'); await pending; });
  expect(signed).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('releases the busy screen and ignores completion of a replaced signing request', async () => {
  const oldNext = jest.fn();
  const newNext = jest.fn();
  const {renderer, details} = setup({}, {next: oldNext});
  await selectSource(renderer);
  let release;
  mockSubmitReviewedIdentityUpdate.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  let pending;
  act(() => { pending = slide(renderer).props.onPress(); });
  expect(renderedText(renderer)).toContain('Broadcasting update');
  expect(slide(renderer).props.loading).toBe(true);
  const previousProps = renderer.root.findByType(ConfirmPayStep).props;
  act(() => renderer.update(<ConfirmPayStep {...previousProps} details={{...details}} next={newNext} />));
  expect(renderedText(renderer)).not.toContain('Broadcasting update');
  expect(renderer.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  await act(async () => { release({txid: 'ab'.repeat(32)}); await pending; });
  expect(oldNext).not.toHaveBeenCalled();
  expect(newNext).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  renderer.unmount();
});

it('allows the replacement request to prepare while an old key prompt is still pending', async () => {
  const {renderer, details} = setup();
  await selectSource(renderer);
  let release;
  requestPrivKey.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  mockSubmitReviewedIdentityUpdate.mockImplementationOnce(async ({context, getKeys}) => {
    await getKeys();
    if (context.signal.aborted) throw Object.assign(new Error('Dialog replaced'), {code: 'SESSION_CHANGED'});
    throw new Error('Old request must not sign');
  });
  let pending;
  act(() => { pending = slide(renderer).props.onPress(); });
  const previousProps = renderer.root.findByType(ConfirmPayStep).props;
  act(() => renderer.update(<ConfirmPayStep {...previousProps} details={{...details}} />));
  await selectSource(renderer);
  expect(slide(renderer).props.disabled).toBe(false);
  await act(async () => { release('old-wallet-key'); await pending; });
  expect(slide(renderer).props.disabled).toBe(false);
  expect(mockCreateUpdateIdentityTx).toHaveBeenCalledTimes(2);
  expect(Alert.alert).not.toHaveBeenCalled();
  renderer.unmount();
});
