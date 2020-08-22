import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';

import {
  Input
} from 'react-native-elements';

import Spinner from 'react-native-loading-spinner-overlay';
import DelayedAlert from '../../../../utils/delayedAlert';

import StandardButton from '../../../../components/StandardButton';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';
import { NavigationActions } from '@react-navigation/compat';

import {
  putWyreAccountField
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';
import Colors from '../../../../globals/colors';

class ManageWyreEmail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email:  this.props.field == null? "" : this.props.field.value,
      error: null,
    };
  }

  handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  validateFormData = () => {
    this.setState({
      error: null,
    }, () => {
      const userEmail = this.state.email;

      let errors = false;

      const emailReg = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      if (!userEmail) {
        this.setState({ error: 'Required field' });
        errors = true;
      } else if (!emailReg.test(userEmail)) {
        this.setState({ error: 'Enter valid email ex: somebody@example.com' });
        errors = true;
      }

      if (!errors) {
        this.doSubmit();
      }
    });
  }


  doSubmit = () => {
    this.props.putWyreAccountField([{
      fieldId: 'individualEmail',
      value: this.state.email,
    }],
    this.props.navigation,
    () => {
      DelayedAlert('Success, Check your email and verify account');
      this.props.navigation.dispatch(NavigationActions.back())
    }
    );
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          <View style={styles.mainInputView}>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View >
              <Input
                label="Enter Email:"
                labelStyle={styles.formLabel}
                underlineColorAndroid={Colors.quaternaryColor}
                onChangeText={(text) => this.setState({ email: text })}
                value={this.state.email}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View style={styles.buttonContainerBottom}>
              <StandardButton
                style={styles.buttonSubmit}
                title="SUBMIT"
                onPress={this.handleSubmit}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyrePutAccountIsFetching(state),
  field: selectWyreAccountField(state, 'individualEmail'),
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreEmail);
