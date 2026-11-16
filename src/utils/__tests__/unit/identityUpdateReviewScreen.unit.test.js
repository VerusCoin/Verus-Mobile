jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: {create: styles => styles},
}));
jest.mock('react-native-paper', () => ({...jest.requireActual('react-native-paper'), Text: 'Text', Portal: 'Portal'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../components/SemiModal', () => ({visible, children}) => visible ? children : null);
const mockState = {modal: {stack: []}, settings: {generalWalletSettings: {}}};
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const ReviewStep = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ReviewStep').default;
const {RequestCard} = require('../../../containers/DeepLink/components/RequestReview');
const {buildIdentityStateChange} = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/buildIdentityStateChange');

const renderedText = renderer => renderer.root.findAllByType('Text')
  .map(node => node.children.filter(child => typeof child === 'string' || typeof child === 'number').join(''))
  .join('\n');
const identityStateChange = buildIdentityStateChange({
  currentIdentity: {flags: 2, timelock: 20},
  updatedIdentity: {flags: 0, timelock: 140},
  chainHeight: 100,
  secondsPerBlock: 60,
});
const flattenStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const render = ({signed = true, loadVerusId = jest.fn()} = {}) => {
  let renderer;
  act(() => { renderer = create(
    <ReviewStep
      identityStateChange={identityStateChange}
      requestCard={<RequestCard
        action="wants to update"
        requester={{
          request: {isSigned: () => signed},
          signerFqn: signed ? 'requester@' : null,
          signerIdentityID: 'iRequester',
          signerSystemID: 'iSystem',
          signerSystemName: 'VRSC',
          loadVerusId,
        }}
        responderName="my-profile@"
        responderWord=""
        showResponder
      />}
    />,
  ); });
  return renderer;
};

describe('opening identity update review screen', () => {
  // The requester sheet's open animation must not outlive the test.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the full proposed content alongside its identity and requester before any interaction', async () => {
    const loadVerusId = jest.fn(async () => null);
    const renderer = render({loadVerusId});
    const text = renderedText(renderer);

    expect(text).toContain('my-profile@');
    expect(text).toContain('requester@');
    expect(text).toContain('wants to update');
    expect(text).toContain(identityStateChange.before.status);
    expect(text).toContain(identityStateChange.after.status);
    expect(loadVerusId).not.toHaveBeenCalled();

    // Names and text stay whole: no truncation, no height cap, system text size.
    for (const node of renderer.root.findAllByType('Text')) {
      expect(node.props.numberOfLines == null || node.props.numberOfLines === 0).toBe(true);
      expect(node.props.allowFontScaling).not.toBe(false);
      expect(node.props.maxFontSizeMultiplier == null || node.props.maxFontSizeMultiplier === 0).toBe(true);
      const style = flattenStyle(node.props.style);
      expect(style.height).toBeUndefined();
      expect(style.maxHeight).toBeUndefined();
    }

    await act(async () => renderer.root.findByProps({accessibilityLabel: 'Request from requester@, verified'}).props.onPress());
    expect(loadVerusId).toHaveBeenCalledTimes(1);
    expect(renderedText(renderer)).toContain('VRSC');
    renderer.unmount();
  });

  it('keeps content readable for an unsigned request and explains the separate sensitive-change review', () => {
    const renderer = render({signed: false});
    const text = renderedText(renderer);

    expect(text).toContain('my-profile@');
    expect(text).toContain('Unsigned request');
    expect(text).not.toContain('requester@');
    expect(text).toContain(identityStateChange.after.status);
    expect(renderer.root.findAllByType('TouchableOpacity').filter(node =>
      node.props.accessibilityLabel === 'Unsigned request')).toHaveLength(0);
    renderer.unmount();
  });
});
