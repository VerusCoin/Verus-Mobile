import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import { NavigationActions } from 'react-navigation';

import { selectWyreCreateAccountIsFetching } from '../../../../selectors/paymentMethods'

import AccountRenderers from '../renderers/mappings';

import { SUPPORTED_PAYMENT_METHODS } from '../../../../utils/constants';

import Spinner from 'react-native-loading-spinner-overlay';

import styles from './SelectPaymentMethod.styles';

import Colors from '../../../../globals/colors';

class SelectPaymentMethod extends Component {
  back = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  }

  onSelect = (method) => {
    const { onSelect } = this.props.navigation.state.params;
    if (!onSelect) return;
    onSelect(method);
    this.back();
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <Spinner
            visible={this.props.isCreating}
            textContent="Loading..."
            textStyle={{ color: 'black' }}
            color={Colors.quinaryColor}
          />
          <View style={styles.inputAndDropDownContainer}>
            { SUPPORTED_PAYMENT_METHODS.map((method) => {
              const Renderer = AccountRenderers[method.id];
              return (
                <Renderer
                  key={Renderer}
                  navigation={this.props.navigation}
                  onSelect={() => { this.onSelect(method); }}
                />
              );
            })}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  isCreating: selectWyreCreateAccountIsFetching(state),
});


export default connect( mapStateToProps )(SelectPaymentMethod);
