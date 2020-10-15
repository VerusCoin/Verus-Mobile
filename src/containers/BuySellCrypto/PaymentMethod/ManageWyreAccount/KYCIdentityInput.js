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
  ScrollView
} from 'react-native';
import { Input } from 'react-native-elements';
import { Dropdown } from 'react-native-material-dropdown';
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
import { STATES, PRIMETRUST_COUNTRIES } from '../../../../utils/constants/constants';

import PrimeTrustInterface from '../../../../utils/PrimeTrust/provider';


class KYCIdentityInput extends Component {
  constructor(props) {
    super(props);
    //need to check that the user is logged in at this stage.
    let userName = "";
    let email = "";
    let existingContact = {};

    if(PrimeTrustInterface.user === null) {
      //redirect to  the  login page
      console.log("redirecting to login page:");
      this.props.navigation.navigate("KYCStart");
    }

    try{
   //  userName = PrimeTrustInterface.user.data[0].attributes.name;
      email = PrimeTrustInterface.user.data[0].attributes.email;
    } catch(error){
      console.log(error);
    }

    this.state = {
      name:  userName,
      email: email,
      dateOfBirth:  this.props.individualDateOfBirth == null? "" : this.props.individualDateOfBirth.value,
      taxCountry: this.props.individualTaxCountry == null? "" : this.props.individualTaxCountry.value,
      socialSecurityNumber:  this.props.individualSsn == null? "" : this.props.individualSsn.value,
      gender: this.props.gender == null? "" : this.props.individualGender.value,
      phoneNumber: this.props.phoneNumber == null? "" : this.props.individualPhoneNumber.value,
      errors: {
        name: null,
        dateOfBirth: null,
        socialSecurityNumber: null,
      },
      date: new Date(),
      mode: 'date',
      showCalendar: false,
    };




    //otherwise load the user data

    console.log("PT User:",PrimeTrustInterface.user.data);

    //if there is an existing contact load and populate the data
    PrimeTrustInterface.getContacts().then((contacts) => {
      if(contacts.data.data[0] != undefined){
        existingContact = contacts.data.data[0];

        console.log("existing contact:",existingContact);
        this.setState({contactId : existingContact.id});
        if(this.state.name == "") this.setState({name : existingContact.attributes["name"]});
        if(this.state.taxCountry == "") this.setState({taxCountry : existingContact.attributes["tax-country"]});
        if(this.state.socialSecurityNumber == "") this.setState({socialSecurityNumber : existingContact.attributes["tax-id-number"]});
        if(this.state.gender == "") this.setState({gender : existingContact.attributes["sex"]});

        //retrieve the phone number
        let existingPhoneNumberId = contacts.data.data[0].relationships["primary-phone-number"].data.id;
        let existingPhoneNumber = contacts.data.included.find(item =>
          item.type == "phone-numbers" && item.id == existingPhoneNumberId
        );
        if(existingPhoneNumberId) {
          this.setState({phoneNumberID : existingPhoneNumberId});
          if(this.state.phoneNumber == "") this.setState({phoneNumber : existingPhoneNumber.attributes.number});
        }

        if(this.state.dateOfBirth == "") this.setState({dateOfBirth : existingContact.attributes["date-of-birth"]});
      }
      console.log("after State:",this.state)
    });
    //overwrite the values with the props data

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

      /*if (!userSocialSecurityNumber) {
        errors.socialSecurityNumber = 'Required field';
        inputError = true;
      } else if (!regexsocialSecurityNumber.test(userSocialSecurityNumber)) {
        errors.socialSecurityNumber = '"SSN" must be in the following format XXX-XX-XXXX';
        inputError = true;
      }*/


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
    //create a contact for the id

    //retrieve the current user to get the email and
    let userDetail = PrimeTrustInterface.user.data[0].attributes;
    //to create the contact we need an address too, so need to redirect to the address form passing the parameters
    let contact = {
      email: userDetail.email,
      name: userDetail.name,
      dob: this.state.dateOfBirth,
      gender: this.state.gender,
      ssn: this.state.socialSecurityNumber,
      taxCountry: this.state.taxCountry,
      phoneNumber: this.state.phoneNumber
    };
    if(this.state.contactId != undefined) contact.contactId = this.state.contactId;
    this.props.navigation.navigate("KYCAddressInput", {
      contact: contact
    });


  };

  render() {

/*
<View style={{ ...Styles.topPadding, width: '100%' }}>
  <Input
      label="Social Security/ Tax Number:"
      labelStyle={Styles.formLabel}
      inputStyle={Styles.normalKYCText}
      onChangeText={(text) => this.setState({ socialSecurityNumber: text })}
      value={this.state.socialSecurityNumber}
      autoCorrect={false}
      inputStyle={Styles.formInputContainer}
    />
</View>


*/

    return (
      <TouchableWithoutFeedback onPress={() =>{
        Keyboard.dismiss()
        if (this.state.showCalendar){
          this.hideCalendar();
        }
      }} accessible={false}>
        <View style={Styles.root}>
          <View style={Styles.progressBarContainer}>
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
          </View>
          <ScrollView>
            <View style={Styles.mainInputView}>
              <Spinner
                visible={this.props.isFetching}
                textContent="Loading..."
                textStyle={{ color: '#FFF' }}
              />
                          <View style={Styles.padding}>
              <View>
                <Text style={{...Styles.boldText}}>Enter your personal information</Text>
              </View>
            </View>
            <View style={{...Styles.wideCenterBlockInput, ...Styles.topPadding}}>
                <Input
                  label="Legal Name:"
                  labelStyle={Styles.formLabel}
                  inputStyle={Styles.normalKYCText}
                  onChangeText={(text) => this.setState({ name: text })}
                  value={this.state.name}
                  autoCorrect={false}
                  inputStyle={Styles.formInputContainer}
                />
              </View>
              <View style={Styles.wideCenterBlockInput90}>
              <TouchableOpacity onPress={this.showCalendar}>
              <Text style={{...Styles.formLabel}}>
                  Date of Birth YYYY-MM-DD:
                </Text>
                <View>
                  <TextInputMask
                    onChangeText={(formatted) => {
                      this.setState({dateOfBirth: formatted})
                    }}
                    value={this.state.dateOfBirth}
                    mask={"[0000]-[00]-[00]"}
                    style={{ ...Styles.formInput, borderBottomWidth: 1}}
                  />
                  <View style={Styles.containerCalendarButton} >
                    <TouchableOpacity onPress={this.showCalendar}>
                      <Image
                        source={Calendar}
                        style={Styles.icon}
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
              <View>
                <View style={{ ...Styles.topPadding}}>
                    <Dropdown
                      labelExtractor={(item) => item.value}
                      valueExtractor={(item) => item.value}
                      label="Gender: "
                      labelTextStyle={{ fontWeight: '700' }}
                      data={[{ value: 'male' },{ value: 'female' },{ value: 'other' } ]}
                      onChangeText={(value) => this.setState({ gender: value })}
                      textColor={Colors.quaternaryColor}
                      selectedItemColor={Colors.quaternaryColor}
                      baseColor={Colors.quaternaryColor}
                      value={this.state.gender}
                      inputContainerStyle={Styles.dropdownInputContainer}
                      pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                    />
                </View>
              </View>

              <View>
                    <View style={{ ...Styles.topPadding}}>
                    <Dropdown
                      labelExtractor={(item) => item.value}
                      valueExtractor={(item) => item.value}
                      label="Tax Country: "
                      labelTextStyle={{ fontWeight: '700' }}
                      data={PRIMETRUST_COUNTRIES}
                      onChangeText={(value) => this.setState({ taxCountry: value })}
                      textColor={Colors.quaternaryColor}
                      selectedItemColor={Colors.quaternaryColor}
                      baseColor={Colors.quaternaryColor}
                      value={this.state.taxCountry ? `${this.state.taxCountry}` : ''}
                      inputContainerStyle={Styles.dropdownInputContainer}
                      pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                    />
                </View>
              </View>
              </TouchableOpacity>
              </View>
              <View style={{...Styles.wideCenterBlockInput, ...Styles.topPadding}}>
                <View >
                  <Input
                      label="Social Security/ Tax Number:"
                      labelStyle={Styles.formLabel}
                      inputStyle={Styles.normalKYCText}
                      onChangeText={(text) => this.setState({ socialSecurityNumber: text })}
                      value={this.state.socialSecurityNumber}
                      autoCorrect={false}
                      inputStyle={Styles.formInputContainer}
                    />
                </View>
                <View style={{ ...Styles.topPadding }}>
                  <Input
                      label="Phone Number including country code:"
                      labelStyle={Styles.formLabel}
                      inputStyle={Styles.normalKYCText}
                      onChangeText={(text) => this.setState({ phoneNumber: text })}
                      value={this.state.phoneNumber}
                      autoCorrect={false}
                      inputStyle={Styles.formInputContainer}
                    />
                 </View>
              </View>
              <View style={Styles.buttonContainerBottom}>
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
            </ScrollView>
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
