/**
 * @format
 * @flow strict-local
 */
import React from 'react';
import VerusMobile from './src/VerusMobile';
import store from './src/store';
import {Provider} from 'react-redux';
import {
  Provider as PaperProvider,
  DefaultTheme,
  configureFonts,
} from 'react-native-paper';
import {
  Text,
  TextInput
} from 'react-native';
import BigNumber from 'bignumber.js';
import Colors from './src/globals/colors';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = Text.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;

BigNumber.set({ EXPONENTIAL_AT: 1000000, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

const fontConfig = {
  default: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
  ios: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
  android: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primaryColor,
    accent: Colors.verusGreenColor,
  },
  fonts: configureFonts(fontConfig),
};

export default class App extends React.Component {
  render() {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <PaperProvider theme={theme}>
          <Provider store={store}>
            <VerusMobile />
          </Provider>
        </PaperProvider>
      </GestureHandlerRootView>
    );
  }
}
