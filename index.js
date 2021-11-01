/** @format */
//import 'react-native-gesture-handler'
import { AppRegistry } from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import './shims/crypto.js';
import './shims/stringify.js';

AppRegistry.registerComponent(appName, () => App);
