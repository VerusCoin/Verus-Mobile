jest.mock('react-native', () => ({
  Dimensions: {get: () => ({width: 390, height: 844})},
  Platform: {OS: 'ios'},
  ScrollView: 'ScrollView',
  View: 'View',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {absoluteFill: {}, create: value => value},
}));
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {View: 'AnimatedView', ScrollView: 'AnimatedScrollView'},
  // A shared value retains its initial value across renders in the real
  // runtime. Returning a new object every render hides stale card positions.
  useSharedValue: initial => require('react').useRef({value: initial}).current,
  useAnimatedRef: () => require('react').useRef(),
  useAnimatedScrollHandler: handlers => handlers,
  useAnimatedGestureHandler: handlers => handlers,
  useAnimatedReaction: () => {},
  useAnimatedStyle: callback => callback(),
  withTiming: jest.fn((value, _configuration, callback) => {callback?.(true); return value;}),
  withSpring: value => value,
  runOnJS: callback => callback,
  scrollTo: jest.fn(),
  Easing: {inOut: value => value, ease: value => value},
}));
jest.mock('../../haptics/haptics', () => ({triggerLightHaptic: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {withTiming} = require('react-native-reanimated');
const SortableGrid = require('../../../components/DragSort/SortableGrid').default;

let views;
beforeEach(() => {views = [];});
afterEach(() => act(() => views.forEach(view => view.unmount())));

const grid = (ids, props = {}) => (
  <SortableGrid animate editing minDist={60} onPressDetected={() => {}} onDragEnd={() => {}} {...props}>
    {ids.map(id => <View key={id} id={id} />)}
  </SortableGrid>
);
const View = 'View';
const mount = (ids, props) => {
  let view;
  act(() => {view = create(grid(ids, props));});
  views.push(view);
  return view;
};
const gesture = (view, id) => view.root.findAllByType('PanGestureHandler').find(node =>
  node.findAllByType('View').some(child => child.props.id === id));
const press = (view, id) => {
  const handlers = gesture(view, id).props.onGestureEvent;
  act(() => {
    handlers.onStart({x: 2, y: 2}, {});
    handlers.onFail({x: 2, y: 2}, {});
  });
};

test('loads the home cards after an initially empty animated grid and keeps them pressable', () => {
  const onPressDetected = jest.fn();
  const view = mount([], {onPressDetected});
  const ids = ['total', 'currency:VRSC', 'verusid'];
  act(() => view.update(grid(ids, {onPressDetected})));
  ids.forEach(id => press(view, id));
  expect(onPressDetected.mock.calls).toEqual(ids.map(id => [id]));
});

test.each([
  [['total', 'currency:VRSC'], ['total', 'currency:VRSC', 'currency:BTC']],
  [['total', 'currency:VRSC', 'currency:BTC'], ['total', 'currency:BTC']],
  [['total', 'currency:VRSC'], ['total', 'currency:VRSCTEST']],
  [['total', 'currency:VRSC'], ['currency:VRSC', 'total']],
])('rebuilds positions for changed cards %j → %j', (before, after) => {
  const onPressDetected = jest.fn();
  const onDragEnd = jest.fn();
  const view = mount(before, {onPressDetected, onDragEnd});
  act(() => view.update(grid(after, {onPressDetected, onDragEnd})));
  expect(view.root.findAllByType('PanGestureHandler')).toHaveLength(after.length);
  after.forEach(id => press(view, id));
  expect(onPressDetected.mock.calls).toEqual(after.map(id => [id]));
  act(() => gesture(view, after[0]).props.onGestureEvent.onEnd());
  expect(onDragEnd).toHaveBeenLastCalledWith(Object.fromEntries(after.map((id, index) => [id, index])));
});

test('ordinary card updates retain an in-progress ordering and use the latest press callback', () => {
  const ids = ['total', 'currency:VRSC'];
  const originalPress = jest.fn();
  const latestPress = jest.fn();
  const onDragEnd = jest.fn();
  const view = mount(ids, {onPressDetected: originalPress, onDragEnd});
  const handlers = gesture(view, 'total').props.onGestureEvent;
  const context = {};
  act(() => {
    handlers.onStart({x: 0, y: 0}, context);
    handlers.onActive({translationX: 179, translationY: 0}, context);
  });
  act(() => view.update(grid(ids, {onPressDetected: latestPress, onDragEnd})));
  act(() => gesture(view, 'total').props.onGestureEvent.onEnd());
  expect(onDragEnd).toHaveBeenLastCalledWith({total: 1, 'currency:VRSC': 0});
  press(view, 'total');
  expect(originalPress).not.toHaveBeenCalled();
  expect(latestPress).toHaveBeenCalledWith('total');
});

test('a cancelled snap animation cannot save the old grid order after its cards change', () => {
  const onDragEnd = jest.fn();
  const view = mount(['total', 'currency:VRSC'], {onDragEnd});
  let finishAnimation;
  withTiming.mockImplementationOnce((value, _configuration, callback) => {
    finishAnimation = callback;
    return value;
  });
  act(() => gesture(view, 'total').props.onGestureEvent.onEnd());
  act(() => view.update(grid(['total', 'currency:VRSCTEST'], {onDragEnd})));
  act(() => finishAnimation(false));
  expect(onDragEnd).not.toHaveBeenCalled();
});
