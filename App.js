/**
 * @format
 * @flow strict-local
 */
import React from 'react';
import VerusMobile from './src/VerusMobile'
import store from './src/store'
import { Provider } from 'react-redux'
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import BigNumber from 'bignumber.js';
import Colors from './src/globals/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

BigNumber.set({EXPONENTIAL_AT: 1000000});

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primaryColor,
    accent: Colors.verusGreenColor,
  },
};

export default class App extends React.Component {
  render() {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <Provider store={store}>
            <VerusMobile/>
          </Provider>
        </PaperProvider>
      </GestureHandlerRootView>
    );
  }
}
