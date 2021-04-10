import React from 'react';
import VerusMobile from './src/VerusMobile'
import store from './src/store'
import { Provider } from 'react-redux'
import { NavigationContainer } from '@react-navigation/native';
import BigNumber from 'bignumber.js';

BigNumber.set({EXPONENTIAL_AT: 1000000});

export default class App extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <NavigationContainer>
          <VerusMobile/>
        </NavigationContainer>
      </Provider>
    );
  }
}
