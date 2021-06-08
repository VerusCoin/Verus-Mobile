import React from 'react';
import VerusMobile from './src/VerusMobile'
import store from './src/store'
import { Provider } from 'react-redux'
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import Colors from './src/globals/colors';

BigNumber.set({EXPONENTIAL_AT: 1000000});

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primaryColor,
    accent: Colors.secondaryColor,
  },
};

export default class App extends React.Component {
  render() {
    return (
      <PaperProvider theme={theme}>
        <Provider store={store}>
          <NavigationContainer>
            <VerusMobile/>
          </NavigationContainer>
        </Provider>
      </PaperProvider>
    );
  }
}
