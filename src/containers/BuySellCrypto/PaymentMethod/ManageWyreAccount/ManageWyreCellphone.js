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

import StandardButton from '../../../../components/StandardButton';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  putWyreAccountField
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';
import Colors from '../../../../globals/colors';

class ManageWyreCellphone extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phone:  this.props.field == null? {} : this.props.field.value,
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
      const userPhone = this.state.phone;

      let errors = false;

      const numberReg = /^[0-9)(-]+$/;

      if (!userPhone) {
        this.setState({ error: 'Required field' });
        errors = true;
      } else if (!numberReg.test(userPhone)) {
        this.setState({ error: 'Enter valid phone number, ex: (123)456-78-90' });
        errors = true;
      }

      if (!errors) {
        this.doSubmit();
      }
    });
  }


  doSubmit = () => {
    this.props.putWyreAccountField([{
      fieldId: 'individualCellphoneNumber',
      value: `+${this.state.phone}`,
    }], this.props.navigation);
  };

  render() {
    console.log(this.props)
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          <View style={styles.mainInputView}>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <Input
                label="Enter Cellphone Number:"
                labelStyle={styles.formLabel}
                underlineColorAndroid={Colors.quaternaryColor}
                onChangeText={(text) => this.setState({ phone: text })}
                value={this.state.phone}
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
  field: selectWyreAccountField(state, 'individualCellphoneNumber'),
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreCellphone);
