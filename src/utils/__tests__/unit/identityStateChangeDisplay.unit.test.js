jest.mock('react-native', () => ({
  ScrollView: 'ScrollView',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: {create: styles => styles},
}));

jest.mock('react-native-paper', () => ({
  Checkbox: {Android: 'Checkbox'},
  Portal: 'Portal',
  Text: 'Text',
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../styles', () => ({highRiskStepStyles: {}}));
jest.mock(
  '../../../containers/DeepLink/IdentityUpdateRequestInfo/components/AuthorityInfoSheet',
  () => () => null,
);

const React = require('react');
const {act, create} = require('react-test-renderer');
const HighRiskStep = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/HighRiskStep').default;
const IdentityStateChangeCard = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/components/IdentityStateChangeCard').default;
const {buildIdentityStateChange} = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/buildIdentityStateChange');
const {VERUSID_REVOCATION_AUTH} = require('../../constants/verusidObjectData');

const change = buildIdentityStateChange({
  currentIdentity: {flags: 2, timelock: 20},
  updatedIdentity: {flags: 0, timelock: 140},
  chainHeight: 100,
  secondsPerBlock: 60,
});

const clearedTimelockChange = buildIdentityStateChange({
  currentIdentity: {flags: 0, timelock: 80},
  updatedIdentity: {flags: 0, timelock: 0},
  chainHeight: 100,
  secondsPerBlock: 60,
});

const getText = node => {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join(' ');
  return getText(node.children);
};

const normalizeText = text => text.replace(/\s+/g, ' ').trim();
const renderedText = renderer => normalizeText(getText(renderer.toJSON()));

const renderHighRisk = overrides => create(
  <HighRiskStep
    highRiskChanges={[change]}
    identityStateChange={change}
    acknowledged={false}
    onToggle={jest.fn()}
    styles={{}}
    {...overrides}
  />,
);

describe('identity lock change review', () => {
  it.each([false, true])('includes the total wait in the main warning (detailed: %s)', detailed => {
    const lockChange = buildIdentityStateChange({
      currentIdentity: {flags: 0, timelock: 0},
      updatedIdentity: {flags: 2, timelock: 20},
      chainHeight: 100,
      secondsPerBlock: 60,
    });
    const renderer = create(<IdentityStateChangeCard change={lockChange} detailed={detailed} />);
    const warning = renderer.root.findAllByType('Text').find(node =>
      typeof node.props.children === 'string' && node.props.children.startsWith('Spending from this identity'),
    ).props.children;

    expect(warning).toContain('20 blocks unlock delay + 20-block default expiry window = 40 blocks, about 40 minutes');
    expect(warning).toContain('Setting this lock does not start the waiting period');
    renderer.unmount();
  });

  it('shows before/after values, including zero, in the compact review card', () => {
    for (const reviewedChange of [change, clearedTimelockChange]) {
      const renderer = create(<IdentityStateChangeCard change={reviewedChange} />);
      const text = renderedText(renderer);

      expect(text).toContain('Current');
      expect(text).toContain('After update');
      for (const state of [reviewedChange.before, reviewedChange.after]) {
        expect(text).toContain(state.status);
        expect(text).toContain(`Flags: ${state.flags}`);
        expect(text).toContain(`Timelock: ${state.timelock}`);
      }
      expect(text).not.toContain(normalizeText(reviewedChange.lockExplanation));
      renderer.unmount();
    }
  });

  it('shows lock-only warnings and explanations without expanding details', () => {
    const renderer = renderHighRisk();
    const text = renderedText(renderer);

    expect(text).toContain(change.before.status);
    expect(text).toContain(change.after.status);
    expect(text).toContain(change.warning);
    expect(text).toContain(normalizeText(change.lockExplanation));
    expect(text).toContain('Flags: 0');
    expect(text).toContain('Timelock: 140');
    renderer.unmount();
  });

  it('keeps the lock change visible alongside an authority change', () => {
    const renderer = renderHighRisk({
      highRiskChanges: [
        change,
        {key: VERUSID_REVOCATION_AUTH.key, title: 'Change revocation authority', data: 'new-authority@'},
      ],
      currentAuthorities: {revocation: 'current-authority@'},
    });
    const text = renderedText(renderer);

    expect(text).toContain('new-authority@');
    expect(text).toContain(change.before.status);
    expect(text).toContain(change.after.status);
    expect(text).toContain(normalizeText(change.lockExplanation));
    renderer.unmount();
  });

  it('retains explicit acknowledgement of a lock-only change', () => {
    const onToggle = jest.fn();
    const renderer = renderHighRisk({onToggle});
    const acknowledgement = renderer.root.findByProps({
      accessibilityLabel: 'Acknowledge high-risk changes',
    });

    expect(acknowledgement.props.accessibilityState.checked).toBe(false);
    act(() => acknowledgement.props.onPress());
    expect(onToggle).toHaveBeenCalledTimes(1);

    act(() => renderer.update(
      <HighRiskStep
        highRiskChanges={[change]}
        identityStateChange={change}
        acknowledged={true}
        onToggle={onToggle}
        styles={{}}
      />,
    ));
    expect(renderer.root.findByProps({
      accessibilityLabel: 'Acknowledge high-risk changes',
    }).props.accessibilityState.checked).toBe(true);
    expect(renderedText(renderer)).toContain(normalizeText(change.lockExplanation));
    renderer.unmount();
  });
});
