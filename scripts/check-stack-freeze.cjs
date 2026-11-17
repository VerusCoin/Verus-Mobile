// Controlled render check. Run with node; no Jest runtime or device is used.
// Real stack, Screen, DelayedFreeze and react-freeze code runs against native
// boundary substitutes. Native animation completion is controlled by this check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const React = require('react');
const {act, create} = require('react-test-renderer');
const platform = process.argv[2] || 'ios';
assert.ok(['ios', 'android'].includes(platform), 'platform must be ios or android');

const stackRoot = path.dirname(require.resolve('@react-navigation/stack/package.json'));
const screensRoot = path.dirname(require.resolve('react-native-screens/package.json'));
const animations = new Map();
const renders = new Map();
const updates = new Map();
const callbacks = [];
let nextListener = 0;

class Value {
  constructor(value) { this.value = value; }
  setValue(value) { this.value = value; }
  interpolate() { return new Value(this.value); }
  addListener() { return String(++nextListener); }
  removeListener() {}
  stopAnimation() { animations.delete(this); }
}
function animation(value, config) {
  return {start(done) { animations.set(value, {config, done}); }};
}
const native = {
  View: 'View', StatusBar: 'StatusBar',
  Platform: {OS: platform, Version: 35, select: (values) => values[platform] ?? values.default},
  StyleSheet: {create: (styles) => styles, absoluteFill: {}, flatten: (style) =>
    Array.isArray(style) ? Object.assign({}, ...style.map(native.StyleSheet.flatten)) : style || {}},
  Animated: {Value, View: 'AnimatedView', createAnimatedComponent: (component) => component,
    spring: animation, timing: animation, event: () => () => {}},
  InteractionManager: {createInteractionHandle: () => 1, clearInteractionHandle() {}},
  Keyboard: {dismiss() {}}, TextInput: {State: {currentlyFocusedInput: () => null}},
  I18nManager: {getConstants: () => ({isRTL: false})}, UIManager: {getViewManagerConfig: () => ({})},
  Easing: {out: (value) => value, poly: () => (value) => value,
    in: (value) => value, bezier: () => (value) => value},
};
const elements = {
  Background: 'Background', getDefaultHeaderHeight: () => 64,
  SafeAreaProviderCompat: {initialMetrics: {frame: {width: 390, height: 844}}},
  getHeaderTitle: (_, name) => name,
  HeaderBackContext: React.createContext(), HeaderHeightContext: React.createContext(64),
  HeaderShownContext: React.createContext(false),
};

// Transform the installed source/module entry points without changing them.
// Only React Native, native views, and navigation's outer context are replaced.
const originalLoad = Module._load;
const originalJS = Module._extensions['.js'];
function compile(module, filename) {
  const {code} = babel.transformFileSync(filename, {
    babelrc: false, configFile: false,
    presets: [['@babel/preset-typescript', {allExtensions: true, isTSX: true}]],
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  module._compile(code, filename);
}
Module._extensions['.tsx'] = compile;
Module._extensions['.ts'] = compile;
Module._extensions['.js'] = (module, filename) => {
  if (filename.startsWith(stackRoot + '/lib/module/')) compile(module, filename);
  else originalJS(module, filename);
};
Module._load = function(request, parent, isMain) {
  if (request === 'react-native') return native;
  if (request === '@react-navigation/elements') return elements;
  if (request === '@react-navigation/native') {
    return {useTheme: () => ({colors: {background: '#fff'}, dark: false})};
  }
  if (parent?.filename.startsWith(screensRoot + '/src/') && request.includes('/fabric/')) {
    return {__esModule: true, default: 'NativeScreen'};
  }
  if (request === 'react-native-screens') {
    return {
      Screen: require(screensRoot + '/src/components/Screen.tsx').default,
      ScreenContainer: require(screensRoot + '/src/components/ScreenContainer.tsx').default,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
global.__DEV__ = true;
require(screensRoot + '/src/core.ts').enableFreeze(true);

function Scene({name}) {
  const [value, setValue] = React.useState(0);
  updates.set(name, setValue);
  renders.set(name, (renders.get(name) || 0) + 1);
  return React.createElement('Scene', {name, value});
}
const styleInterpolator = () => ({});
const noop = () => {};
function propsFor(names, extra = {}) {
  const routes = names.map((name) => ({key: name, name}));
  const descriptors = Object.fromEntries(routes.map((route) => [route.key, {
    route, navigation: {isFocused: () => route === routes.at(-1)},
    options: {headerShown: false, cardOverlayEnabled: false, cardStyleInterpolator: styleInterpolator,
      ...extra.options?.[route.key]},
  }]));
  return {
    insets: {top: 0, right: 0, bottom: 0, left: 0},
    state: {routes, index: routes.length - 1}, routes, descriptors,
    openingRouteKeys: [], closingRouteKeys: [],
    getPreviousRoute: ({route}) => routes[routes.indexOf(route) - 1],
    renderHeader: () => null, renderScene: ({route}) => React.createElement(Scene, {name: route.key}),
    isParentHeaderShown: false, isParentModal: false,
    onOpenRoute: noop, onCloseRoute: noop,
    onTransitionStart: ({route}) => callbacks.push('start:' + route.key),
    onTransitionEnd: ({route}) => callbacks.push('end:' + route.key),
    onGestureStart: ({route}) => callbacks.push('gesture:' + route.key),
    onGestureEnd: noop, onGestureCancel: noop,
    ...extra,
  };
}
async function tick() { await act(async () => { await new Promise(setImmediate); }); }
function complete(gesture) {
  const pending = animations.get(gesture);
  assert.ok(pending, 'animation is pending');
  animations.delete(gesture);
  act(() => { gesture.setValue(pending.config.toValue); pending.done({finished: true}); });
}
function change(name) { act(() => updates.get(name)((value) => value + 1)); }
function expectChange(name, expected, message) {
  const before = renders.get(name);
  change(name);
  assert.equal(renders.get(name) > before, expected, message);
}

async function check(build) {
  const CardStack = require(stackRoot + '/' + build).default;
  let props = propsFor(['Home']);
  let tree;
  act(() => { tree = create(React.createElement(CardStack, props)); });
  const stack = tree.getInstance();
  complete(stack.state.gestures.Home);
  await tick();
  expectChange('Home', true, 'top Home remains live for the root setup overlay');

  function update(next) {
    props = next;
    act(() => tree.update(React.createElement(CardStack, props)));
  }
  update(propsFor(['Home', 'Manage'], {openingRouteKeys: ['Manage']}));
  await tick();
  expectChange('Home', true, 'under-card stays live during push');
  complete(stack.state.gestures.Manage);
  update({...props, openingRouteKeys: []});
  await tick();
  expectChange('Home', false, 'under-card freezes after push completion');
  expectChange('Manage', true, 'top card never freezes');

  // Drive the real Card's gesture handler through its rendered boundary prop.
  const gesture = () => tree.root.findAll((node) =>
    typeof node.props.onHandlerStateChange === 'function').at(-1).props.onHandlerStateChange;
  act(() => gesture()({nativeEvent: {state: 4}})); // ACTIVE
  expectChange('Home', true, 'gesture start thaws synchronously, without waiting for setImmediate');
  assert.equal(callbacks.at(-1), 'gesture:Manage', 'original gesture callback is forwarded');
  act(() => gesture()({nativeEvent: {state: 3, velocityX: 0}})); // CANCELLED
  await tick();
  expectChange('Home', true, 'cancel keeps under-card live until the return animation ends');
  complete(stack.state.gestures.Manage);
  await tick();
  expectChange('Home', false, 'cancelled gesture refreezes only after settling');

  // Restarting an animation on the top Card exercises onTransitionStart before
  // native animation.start, without making Home the focused route first.
  const topCard = tree.root.findAll((node) => node.instance &&
    node.props.gesture === stack.state.gestures.Manage && node.props.onTransition).at(-1);
  act(() => topCard.props.onTransition({closing: true, gesture: false}));
  expectChange('Home', true, 'transition start also thaws immediately');
  update(propsFor(['Home', 'Manage'], {state: {routes: props.routes.slice(0, 1), index: 0},
    closingRouteKeys: ['Manage']}));
  expectChange('Home', true, 'focused route stays live during programmatic Back');
  complete(stack.state.gestures.Manage);
  update(propsFor(['Home']));
  await tick();
  expectChange('Home', true, 'new top card remains live after pop');

  // Two pushes overlap. Completion of the first must not freeze the next
  // under-card while the second is still moving.
  update(propsFor(['Home', 'Manage'], {openingRouteKeys: ['Manage']}));
  update(propsFor(['Home', 'Manage', 'Details'], {openingRouteKeys: ['Manage', 'Details']}));
  complete(stack.state.gestures.Manage);
  update({...props, openingRouteKeys: ['Details']});
  await tick();
  expectChange('Manage', true, 'earlier completion cannot clear a later transition');
  complete(stack.state.gestures.Details);
  update({...props, openingRouteKeys: []});
  await tick();
  expectChange('Manage', false, 'latest under-card freezes after both transitions');
  expectChange('Details', true, 'top card stays live after overlapping pushes');
  expectChange('Home', false, 'deep inactive card keeps existing freeze behavior');
  update(propsFor(['Home', 'Manage', 'Details', 'Aborted'], {openingRouteKeys: ['Aborted']}));
  update(propsFor(['Home', 'Manage', 'Details']));
  await tick();
  expectChange('Manage', false, 'removed pending route does not leave the stack transitioning');
  act(() => tree.unmount());

  for (const extra of [
    {detachInactiveScreens: false},
    {options: {Manage: {detachPreviousScreen: false}}},
    {options: {Manage: {presentation: 'transparentModal'}}},
    {options: {Home: {freezeOnBlur: false}}},
    {options: {Home: {animationEnabled: false}, Manage: {animationEnabled: false}}},
  ]) {
    props = propsFor(['Home', 'Manage'], extra);
    act(() => { tree = create(React.createElement(CardStack, props)); });
    const instance = tree.getInstance();
    complete(instance.state.gestures.Home);
    complete(instance.state.gestures.Manage);
    await tick();
    expectChange('Home', extra.options?.Manage?.animationEnabled === false ? false : true,
      'modal/background and explicit options keep their behavior: ' + JSON.stringify(extra));
    act(() => tree.unmount());
  }
  console.log('PASS ' + platform + ' ' + build + ': push, thaw, cancel, Back, overlapping/removed pushes, modal and freeze opt-outs');
}

(async () => {
  try {
    for (const build of ['src/views/Stack/CardStack.tsx', 'lib/commonjs/views/Stack/CardStack.js',
      'lib/module/views/Stack/CardStack.js']) await check(build);
  } finally {
    Module._load = originalLoad;
    Module._extensions['.js'] = originalJS;
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
