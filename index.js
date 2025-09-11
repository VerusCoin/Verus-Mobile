/** @format */
import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';

const IGNORED_LOGS = [
  'Warning: componentWillMount is deprecated',
  'Warning: componentWillReceiveProps is deprecated',
  'Warning: componentWillUpdate is deprecated',
  'RCTRootView cancelTouches',
  'Require cycle',
  'long period',
  'Material Top Tab Navigator:',
  'ViewPropTypes will be removed from React Native.',
  'Non-serializable values were found in the navigation state.'
];

LogBox.ignoreLogs(IGNORED_LOGS);

import 'fast-text-encoding';
import './shims/crypto.js';
import './shims/buffer.js';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
