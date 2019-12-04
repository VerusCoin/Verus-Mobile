import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  TouchableOpacity,
} from 'react-native';
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements';
import Spinner from 'react-native-loading-spinner-overlay';
import Button1 from '../../../../symbols/button1';
import styles from './ManageWyreAccount.styles';
import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';
import {
  putWyreAccountField
} from '../../../../actions/actions/PaymentMethod/WyreAccount';
import TextInputMask from 'react-native-text-input-mask';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar} from '../../../../images/customIcons/index';
import { parseDate } from '../../../../utils/date';


class ManageWyrePersonalDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: this.props.individualLegalName.value,
      dateOfBirth: this.props.individualDateOfBirth.value,
      socialSecurityNumber: this.props.individualSsn.value,
      errors: {
        name: null,
        dateOfBirth: null,
        socialSecurityNumber: null,
      },
      date: new Date(),
      mode: 'date',
      toggleCalendar: false,
    };
  }

  toggleCalendar = () => {
    this.setState(prevState => ({
      toggleCalendar: !prevState.toggleCalendar
    }));
  }

  setDate = (date) => {
    this.setState({
      dateOfBirth: parseDate(date),
      date,
    });
  }

  handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  validateFormData = () => {
    this.setState({
      errors: {
        name: null,
        dateOfBirth: null,
        socialSecurityNumber: null,
      },
    }, () => {   
      const userName = this.state.name;
      const userDateOfBirth = this.state.dateOfBirth;
      const userSocialSecurityNumber = this.state.socialSecurityNumber;

      let inputError = false;

      const regexdateOfBirth = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
      const regexsocialSecurityNumber = /^([1-9])(?!\1{2}-\1{2}-\1{4})[1-9]{2}-[1-9]{2}-[1-9]{4}$/;

      const errors = {};

      if (!userName) {
        errors.name = 'Required field';
        inputError = true;
      }

      if (!userDateOfBirth) {
        errors.dateOfBirth = 'Required field';
        inputError = true;
      } else if (!regexdateOfBirth.test(userDateOfBirth)) {
        errors.dateOfBirth = '"Date Of Birth" must be in the following format: YYYY-MM-DD';
        inputError = true;
      }

      if (!userSocialSecurityNumber) {
        errors.socialSecurityNumber = 'Required field';
        inputError = true;
      } else if (!regexsocialSecurityNumber.test(userSocialSecurityNumber)) {
        errors.socialSecurityNumber = '"SSN" must be in the following format XXX-XX-XXXX';
        inputError = true;
      }


      if (!inputError) {
        this.doSubmit();
      } else {
        this.setState({
          errors,
        });
      }
    });
  }

  doSubmit = async () => {
    this.props.putWyreAccountField([{
      fieldId: 'individualLegalName',
      value: this.state.name
    }, {
      fieldId: 'individualDateOfBirth',
      value: this.state.dateOfBirth
    }, {
      fieldId: 'individualSsn',
      value: this.state.socialSecurityNumber
    }], this.props.navigation);
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={() =>{
        if (this.state.toggleCalendar){
          this.toggleCalendar();
        }
        Keyboard.dismiss
      }} accessible={false}>
        <View>
          <View style={styles.mainInputView}>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                    Legal Name:
              </FormLabel>
              <FormInput
                underlineColorAndroid="#86939d"
                onChangeText={(text) => this.setState({ name: text })}
                value={this.state.name}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
              <FormValidationMessage>
                {this.state.errors.name}
              </FormValidationMessage>
            </View>
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                Date of Birth YYYY-MM-DD:
              </FormLabel>
              <View style={styles.containerDateOfBirth}>
                <TextInputMask
                  onChangeText={(formatted) => {
                    this.setState({dateOfBirth: formatted})
                  }}
                  value={this.state.dateOfBirth}
                  mask={"[0000]-[00]-[00]"}
                  style={styles.inputMaskDateOfBirth}
                />
                <View style={styles.containerCalendarButton} >
                  <TouchableOpacity onPress={this.toggleCalendar}>
                    <Image
                      source={Calendar}
                      style={styles.icon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                { this.state.toggleCalendar && <DateTimePicker 
                    value={this.state.date}
                    mode={this.state.mode}
                    display="calendar"
                    onChange={this.setDate}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                    style={{backgroundColor: 'white'}} />
                } 
              </View>
              <FormValidationMessage>
                {this.state.errors.dateOfBirth}
              </FormValidationMessage>
            </View>
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                US Social Security Number XXX-XX-XXXX:
              </FormLabel>
              <TextInputMask
                onChangeText={(formatted) => {
                  this.setState({socialSecurityNumber: formatted})
                }}
                mask={"[000]-[00]-[0000]"}
                style={styles.inputMask}
              />
              <FormValidationMessage>
                {this.state.errors.socialSecurityNumber}
              </FormValidationMessage>
            </View>
            <View style={styles.buttonContainerBottom}>
              <Button1
                style={styles.buttonSubmit}
                buttonContent="Submit"
                onPress={()=>{
                  if (this.state.toggleCalendar) {
                    this.toggleCalendar();
                  } 
                  this.handleSubmit();
                }
                }
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
  individualLegalName: selectWyreAccountField(state, 'individualLegalName'),
  individualDateOfBirth: selectWyreAccountField(state, 'individualDateOfBirth'),
  individualSsn: selectWyreAccountField(state, 'individualSsn')
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyrePersonalDetails);
