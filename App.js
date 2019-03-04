import React from 'react';
import VerusMobile from './src/VerusMobile'
import store from './src/store'
import { Provider } from 'react-redux'
import './global'


export default class App extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <VerusMobile/>
      </Provider>
    );
  }
}
