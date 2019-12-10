import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';

import {
  FormLabel,
  FormInput,
  FormValidationMessage
} from 'react-native-elements';

import Spinner from 'react-native-loading-spinner-overlay';

import Button1 from '../../../../symbols/button1';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  putWyreAccountField
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';

class ManageWyreEmail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: this.props.field.value,
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
    }], this.props.navigation);
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
              <FormLabel labelStyle={styles.formLabel}>
                Enter Email:
              </FormLabel>
              <FormInput
                underlineColorAndroid="#86939d"
                onChangeText={(text) => this.setState({ email: text })}
                value={this.state.email}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
              <FormValidationMessage labelStyle={{fontSize: 12}}>
                {this.state.error}
              </FormValidationMessage>
            </View>
            <View style={styles.buttonContainerBottom}>
              <Button1
                style={styles.buttonSubmit}
                buttonContent="Submit"
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
