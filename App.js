/**
 * @format
 * @flow strict-local
 */
import React from 'react';
import VerusMobile from './src/VerusMobile';
import store from './src/store';
import {Provider} from 'react-redux';
import BigNumber from 'bignumber.js';
import applyGlobalTypography from './src/utils/applyGlobalTypography';
import applyThemedKeyboard from './src/utils/applyThemedKeyboard';
import applyNativeSwitchSize from './src/utils/applyNativeSwitchSize';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppThemeProvider from './src/theme/app/AppThemeProvider';

applyGlobalTypography();
applyThemedKeyboard();
applyNativeSwitchSize();

BigNumber.set({ EXPONENTIAL_AT: 1000000, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

export default class App extends React.Component {
  render() {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <Provider store={store}>
            <AppThemeProvider>
              <VerusMobile />
            </AppThemeProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
}
