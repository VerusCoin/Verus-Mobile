let mockState;

jest.mock('react-native', () => ({
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
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 0})}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../styles', () => ({identityUpdateRequestInfoStyles: {}, highRiskStepStyles: {}}));
jest.mock('../../../components/GradientButton', () => 'GradientButton');
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/VerusIdDetailsModal/VerusIdDetailsModal', () => 'IdentityModal');
jest.mock('../../../components/ListSelectionModal/ListSelectionModal', () => 'SelectionModal');
jest.mock('../../../components/VdxfUniValueModal/VdxfUniValueModal', () => 'DataModal');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ReviewStep', () => 'ReviewStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ContentStep', () => 'ContentStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ConfirmPayStep', () => 'ConfirmPayStep');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/components/AuthorityInfoSheet', () => 'AuthorityInfoSheet');
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openAuthenticateUserModal: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn(), resolveAlert: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getFriendlyNameMap: jest.fn(), getIdentity: jest.fn()}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: value => value}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('../../clipboard/clipboard', () => ({copyToClipboard: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const IdentityUpdateRequestInfo = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo').default;

const OWN_ADDRESS = 'RWCqoWfSKaDoGeiwD6ZxX2dwkMx2oHJM56';
const OTHER_ADDRESS = 'RKDPtS54bX89AacDfkHBUm46YoxahHjkCw';
const currentIdentity = {
  primaryaddresses: [OWN_ADDRESS, OTHER_ADDRESS], minimumsignatures: 1,
  recoveryauthority: 'current-recovery', revocationauthority: 'current-revocation',
  flags: 0, timelock: 0, contentmultimap: {},
};
const renderRequest = (updates, identity = currentIdentity) => {
  let renderer;
  act(() => {
    renderer = create(<IdentityUpdateRequestInfo
      subjectIdentity={{fullyqualifiedname: 'T1@', identity}}
      identityUpdates={updates}
      friendlyNames={{}}
      coinObj={{id: 'VRSC', mainnet_id: 'VRSC', seconds_per_block: 60}}
      chainInfo={{longestchain: 100}}
      sigtime={1}
    />);
  });
  return renderer;
};
const nextButton = renderer => renderer.root.findByType('GradientButton');
const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.filter(child => typeof child === 'string').join('')).join(' ');
const goToRiskReview = renderer => act(() => nextButton(renderer).props.onPress());

beforeEach(() => {
  mockState = {
    authentication: {
      signedIn: true,
      accounts: [],
      activeAccount: {testnetOverrides: {}, keys: {VRSC: {vrpc: {addresses: [OWN_ADDRESS]}}}},
    },
    sendModal: {type: null},
  };
});

describe('identity signature-threshold review', () => {
  it.each([false, true])('requires review and acknowledgement when only the threshold changes (partial: %s)', partial => {
    const updates = partial ? {minimumsignatures: 2} : {...currentIdentity, minimumsignatures: 2};
    const renderer = renderRequest(updates);
    expect(renderer.root.findByType('ReviewStep').props.highRiskCount).toBe(1);
    expect(renderer.root.findByType('ReviewStep').props.contentCount).toBe(0);

    goToRiskReview(renderer);
    expect(renderer.root.findAllByType('ContentStep')).toHaveLength(0);
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 2 → 2 of 2');
    expect(renderedText(renderer)).toContain('Spending, signing, and ordinary identity updates will require signatures from 2 of the 2 primary addresses.');
    expect(renderedText(renderer)).toContain('Your wallet will need additional signatures after this update');
    expect(renderedText(renderer)).toContain('After this update, your wallet will have 1 primary address, but 2 signatures will be required to authorize this ID.');
    expect(nextButton(renderer).props.disabled).toBe(true);
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(0);

    act(() => renderer.root.findByProps({accessibilityLabel: 'Acknowledge high-risk changes'}).props.onPress());
    expect(nextButton(renderer).props.disabled).toBe(false);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findByType('ConfirmPayStep').props.highRiskCount).toBe(1);
    renderer.unmount();
  });

  it('shows a reduced threshold and recognizes enough wallet keys', () => {
    const renderer = renderRequest({minimumsignatures: 1}, {...currentIdentity, minimumsignatures: 2});
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain('Required signatures: 2 of 2 → 1 of 2');
    expect(renderedText(renderer)).toContain('Fewer signatures will be needed');
    expect(renderedText(renderer)).toContain('After this update, your wallet will have enough primary addresses to meet the 1-signature requirement.');
    expect(renderedText(renderer)).not.toContain('Your wallet will need additional signatures after this update');
    renderer.unmount();
  });

  it('counts the updated primary addresses when the address list changes too', () => {
    const renderer = renderRequest(
      {primaryaddresses: [OWN_ADDRESS, OTHER_ADDRESS], minimumsignatures: 2},
      {...currentIdentity, primaryaddresses: [OWN_ADDRESS]},
    );
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 1 → 2 of 2');
    expect(renderedText(renderer)).toContain('Add primary address');
    expect(renderedText(renderer)).toContain('Your wallet will need additional signatures after this update');
    renderer.unmount();
  });

  it('keeps the threshold visible alongside authority and timelock changes', () => {
    const renderer = renderRequest({minimumsignatures: 2, recoveryauthority: 'new-recovery', flags: 2, timelock: 20});
    goToRiskReview(renderer);
    expect(renderedText(renderer)).toContain('Required signatures: 1 of 2 → 2 of 2');
    expect(renderedText(renderer)).toContain('Change recovery authority');
    expect(renderedText(renderer)).toContain('Lock identity funds');
    expect(nextButton(renderer).props.disabled).toBe(true);
    renderer.unmount();
  });

  it.each([{}, {minimumsignatures: 1}])('does not invent a threshold change when omitted or unchanged: %p', updates => {
    const renderer = renderRequest(updates);
    expect(renderer.root.findByType('ReviewStep').props.highRiskCount).toBe(0);
    act(() => nextButton(renderer).props.onPress());
    expect(renderer.root.findAllByType('ConfirmPayStep')).toHaveLength(1);
    renderer.unmount();
  });
});
