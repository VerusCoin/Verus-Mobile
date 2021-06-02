import * as iosEnv from './main.ios.json'
import * as androidEnv from './main.android.json'
import { Platform } from 'react-native'

module.exports = Platform.OS === 'ios' ? iosEnv : androidEnv
