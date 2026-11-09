jest.mock('react-native', () => ({
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: {create: styles => styles},
}));
jest.mock('react-native-paper', () => ({Text: 'Text'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../styles', () => ({
  reviewStepStyles: require('../../../styles/deeplink/reviewStep.styles').default,
  highRiskStepStyles: {},
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Text} = require('react-native-paper');
const ReviewStep = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ReviewStep').default;
const styles = require('../../../styles/deeplink/identityUpdateRequestInfo.styles').default;

const payload = 'I do not consent to publishing this statement.\n'
  + 'This later sentence must remain visible in full. '.repeat(12)
  + '最後の内容 — نهاية المحتوى';
const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.filter(child => typeof child === 'string' || typeof child === 'number').join(''))
  .join('\n');
const flattenStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const render = overrides => create(
  <ReviewStep
    signerFqn="requester@"
    signerIdentityID="iRequester"
    canOpenSignerModal
    openVerusIdDetailsModal={jest.fn()}
    chainId="VRSC"
    sigDateString="October 29, 2026"
    fullyqualifiedname="my-profile@"
    details={{expires: () => true}}
    expiryLabel="30 minutes"
    highRiskCount={0}
    styles={styles}
    {...overrides}
  >
    <Text selectable>{payload}</Text>
  </ReviewStep>,
);

describe('opening identity update review screen', () => {
  it('shows the full proposed content alongside its identity and requester before any interaction', () => {
    const openRequester = jest.fn();
    const renderer = render({openVerusIdDetailsModal: openRequester});
    const text = renderedText(renderer);

    expect(text).toContain(payload);
    expect(text).toContain('my-profile@');
    expect(text).toContain('Request from');
    expect(text).toContain('requester@');
    expect(text).toContain('VRSC');
    expect(text).toContain('Expires in 30 minutes');
    expect(text).toContain('Continuing does not update your identity.');
    expect(text).toContain('confirm the update and fee before signing.');
    expect(openRequester).not.toHaveBeenCalled();

    // Long content participates in the page's scroll rather than a closed detail
    // view; the screen does not truncate text or disable the user's text size.
    const scroll = renderer.root.findByType('ScrollView');
    expect(scroll.props.scrollEnabled).not.toBe(false);
    expect(scroll.findAllByType('Text').some(node => node.props.children === payload)).toBe(true);
    for (const node of renderer.root.findAllByType('Text')) {
      expect(node.props.numberOfLines == null || node.props.numberOfLines === 0).toBe(true);
      expect(node.props.allowFontScaling).not.toBe(false);
      expect(node.props.maxFontSizeMultiplier == null || node.props.maxFontSizeMultiplier === 0).toBe(true);
      const style = flattenStyle(node.props.style);
      expect(style.height).toBeUndefined();
      expect(style.maxHeight).toBeUndefined();
    }

    act(() => renderer.root.findByProps({accessibilityLabel: 'View requester requester@'}).props.onPress());
    expect(openRequester).toHaveBeenCalledWith('VRSC', 'iRequester');
    renderer.unmount();
  });

  it('keeps content readable for an unsigned request and explains the separate sensitive-change review', () => {
    const renderer = render({signerFqn: null, highRiskCount: 1, details: {expires: () => false}});
    const text = renderedText(renderer);

    expect(text).toContain(payload);
    expect(text).toContain('Unsigned request');
    expect(text).toContain('The sender of this request has not been verified.');
    expect(text).toContain('1 change requires your acknowledgement on the next screen.');
    expect(text).not.toContain('Expires in');
    expect(renderer.root.findAllByType('TouchableOpacity')).toHaveLength(0);
    renderer.unmount();
  });
});
