/** @format */
import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import {enableFreeze} from 'react-native-screens';

const IGNORED_LOGS = [
  'Warning: componentWillMount is deprecated',
  'Warning: componentWillReceiveProps is deprecated',
  'Warning: componentWillUpdate is deprecated',
  'RCTRootView cancelTouches',
  'Require cycle',
  'long period',
  'Material Top Tab Navigator:',
  'Module TcpSockets requires main queue setup',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'ViewPropTypes will be removed from React Native.',
  'Non-serializable values were found in the navigation state.'
];

LogBox.ignoreLogs(IGNORED_LOGS);

import 'fast-text-encoding';
import './shims/crypto.js';
import './shims/buffer.js';
import App from './App';
import {name as appName} from './app.json';

// Keep mounted inactive screens from redrawing on each wallet update.
// Screens delays freezing until after the first render, preserving tab preload.
// The root wallet-setup overlay is outside these screen boundaries.
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
