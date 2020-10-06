import React from 'react';
import VerusMobile from './src/VerusMobile'
import store from './src/store'
import { Provider } from 'react-redux'
import { Portal } from 'react-native-paper';


export default class App extends React.Component {
  render() {
    return (
      <Portal.Host>
        <Provider store={store}>
          <VerusMobile/>
        </Provider>
      </Portal.Host>
    );
  }
}
