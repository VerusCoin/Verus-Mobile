// Exercise Lottie's JavaScript source parsing/autoplay; replace only native I/O.
jest.mock('lottie-react-native/lib/commonjs/specs/LottieAnimationViewNativeComponent', () => ({
  __esModule: true,
  default: 'NativeLottieAnimationView',
  Commands: {play: jest.fn(), reset: jest.fn(), pause: jest.fn(), resume: jest.fn()},
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {StyleSheet} = require('react-native');
const {Commands} = require('lottie-react-native/lib/commonjs/specs/LottieAnimationViewNativeComponent');
const AnimatedActivityIndicator = require('../../../components/AnimatedActivityIndicator').default;
const AnimatedSuccessCheckmark = require('../../../components/AnimatedSuccessCheckmark').default;

describe('wallet animations with Lottie 7', () => {
  it.each([
    ['loading indicator', AnimatedActivityIndicator, 128, true],
    ['success result', AnimatedSuccessCheckmark, 128, false],
    ['inline success icon', AnimatedSuccessCheckmark, 20, false],
  ])('loads and starts the %s with a visible square viewport', (_, Component, size, loop) => {
    let renderer;
    const nativeView = {};
    Commands.play.mockClear();
    try {
      act(() => {
        renderer = create(<Component style={{width: size}} />, {
          createNodeMock: () => nativeView,
        });
      });
      const animation = renderer.root.findByType('NativeLottieAnimationView');
      const style = StyleSheet.flatten(animation.props.style);
      expect(style.width).toBe(size);
      expect(style.height).toBe(size);
      expect(JSON.parse(animation.props.sourceJson).layers.length).toBeGreaterThan(0);
      expect(animation.props.loop).toBe(loop);
      expect(Commands.play).toHaveBeenCalledWith(nativeView, -1, -1);
    } finally {
      if (renderer) act(() => renderer.unmount());
    }
  });
});
