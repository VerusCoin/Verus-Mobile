import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  TouchableOpacity,
  Platform,
  Text,
} from 'react-native';
import { Input } from 'react-native-elements';
import Spinner from 'react-native-loading-spinner-overlay';

import { Button, Badge } from 'react-native-elements';

import Styles from '../../../../styles/index';

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
import Colors from '../../../../globals/colors';




class KYCIdentityInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name:  this.props.individualLegalName == null? "" : this.props.individualLegalName.value,
      dateOfBirth:  this.props.individualDateOfBirth == null? "" : this.props.individualDateOfBirth.value,
      socialSecurityNumber:  this.props.individualSsn == null? "" : this.props.individualSsn.value,
      errors: {
        name: null,
        dateOfBirth: null,
        socialSecurityNumber: null,
      },
      date: new Date(),
      mode: 'date',
      showCalendar: false,
    };
  }

  showCalendar = () => {
    this.setState({
      showCalendar: true,
    });
  }

  hideCalendar = () => {
    this.setState({
      showCalendar: false,
    });
  }

  setDate = (_, date) => {
    this.setState({
      showCalendar: Platform.OS === 'ios' ? true : false,
    }, () => {
      if (date) {
        this.setState({
          dateOfBirth: parseDate(date),
          date
        })
      }
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
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={() =>{
        Keyboard.dismiss()
        if (this.state.showCalendar){
          this.hideCalendar();
        }
      }} accessible={false}>
        <View style={Styles.root}>
        <View style={Styles.centralRow}>
          <Badge
            status="success"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
        </View>

          <View style={styles.mainInputView}>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <Input
                label="Legal Name:"
                labelStyle={styles.formLabel}
                onChangeText={(text) => this.setState({ name: text })}
                value={this.state.name}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <Text labelStyle={styles.formLabel}>
                Date of Birth YYYY-MM-DD:
              </Text>
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
                  <TouchableOpacity onPress={this.showCalendar}>
                    <Image
                      source={Calendar}
                      style={styles.icon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                { this.state.showCalendar && <DateTimePicker
                    value={this.state.date}
                    mode={this.state.mode}
                    display="calendar"
                    onChange={this.setDate}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                    style={{backgroundColor: 'white'}} />
                }
              </View>
            </View>
            <View>
              <Text labelStyle={styles.formLabel}>
                US Social Security Number XXX-XX-XXXX:
              </Text>
              <TextInputMask
                onChangeText={(formatted) => {
                  this.setState({socialSecurityNumber: formatted})
                }}
                mask={"[000]-[00]-[0000]"}
                style={styles.inputMask}
              />
            </View>
            <View style={styles.buttonContainerBottom}>
              <Button
              titleStyle={Styles.whiteText}
              buttonStyle={Styles.defaultButtonClearWhite}
                title="SUBMIT"
                onPress={()=>{
                  if (this.state.showCalendar) {
                    this.hideCalendar();
                  }
                  this.handleSubmit();
                }
                }
              />
              <Button
              titleStyle={Styles.whiteText}
              buttonStyle={Styles.defaultButtonClearWhite}
                title="CHEAT TO NEXT SCREEN"
                onPress={()=>{
                  this.props.navigation.navigate("KYCAddressInput")
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

export default connect(mapStateToProps, mapDispatchToProps)(KYCIdentityInput);
