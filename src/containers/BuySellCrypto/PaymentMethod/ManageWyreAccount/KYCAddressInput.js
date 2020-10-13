import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
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
import { STATES, PRIMETRUST_COUNTRIES } from '../../../../utils/constants/constants';
import Colors from '../../../../globals/colors';
import PrimeTrustInterface from '../../../../utils/PrimeTrust/provider';
import { update } from 'lodash';


class KYCAddressInput extends Component {
  constructor(props) {
    super(props);

    if(PrimeTrustInterface.user === null) {
      //redirect to  the  login page
      console.log("redirecting to login page:");
      this.props.navigation.navigate("KYCStart");
    }

    const individualAddress = typeof this.props.individualResidenceAddress === 'undefined' ? {} : this.props.individualResidenceAddress.value;
    //load the contact if there is one on the user
    this.state= {
      streetAddress1: individualAddress.street1,
      streetAddress2: individualAddress.street2,
      city: individualAddress.city,
      region: individualAddress.region,
      postalCode: individualAddress.postalCode,
      country: individualAddress.country,
      errors: {
        streetAddress1: null,
        streetAddress2: null,
        city: null,
        region: null,
        postalCode: null,
        country: null,
      },
    };

    let existingContact = null;
    let updatedContact = props.route.params.contact !=undefined ? this.state.contact = props.route.params.contact : null;

    if(props.route.params.contact != undefined){
      this.state.contact = props.route.params.contact;

    } else {
      //need to load the user and update the address
      this.state.contact = {};
    }

    let existingAddress = null;
    PrimeTrustInterface.getAddresses().then((addresses) => {
      console.log("addresses:",addresses.data.data[0]);
      if(addresses.data.data[0] != undefined){
        //set any updated fields
        existingAddress = addresses.data.data[0].attributes;
        console.log("ExistingAddress",existingAddress);
        console.log("individual Country:",existingAddress["country"]);
        if(existingAddress != null){
          this.setState({});
          if(this.state.streetAddress1 == undefined) this.setState({streetAddress1 : existingAddress["street-1"]});
          if(this.state.streetAddress2 == undefined) this.setState({streetAddress2 : existingAddress["street-2"]});
          if(this.state.city == undefined) this.setState({city : existingAddress["city"]});
          if(this.state.region == undefined) this.setState({region : existingAddress["region"]});
          if(this.state.postalCode == undefined) this.setState({postalCode : existingAddress["postal-code"]});
          if(this.state.country == undefined) this.setState({country : existingAddress["country"]});
         }
      }
      console.log("state:",this.state);  
    });
    

    
  }

  handleError = (error, field) => {
    const displayError = this.state.errors;
    displayError[field] = error;
    this.setState({ errors: displayError });
  }

  handleSubmit = () => {
    Keyboard.dismiss();
    console.log("handleSunmit",this.state);
    if(!this.validateFormData()){
      
        this.doSubmit();

    } else {
      console.log("errors:",this.state.errors);
      //loop throiugh the errors and create a message
      let message = "";
      this.state.errors.forEach((value,key) => {
        message += key + " " + value + "\r\n";
      });
      Alert.alert("Contact details failed", message );
    }
  };

  validateFormData = () => {

    console.log("validating data");
    this.setState({
      errors: {
        streetAddress1: null,
        streetAddress2: null,
        city: null,
        region: null,
        postalCode: null,
        country: null,
      },
    }, () => {
      console.log("state:",this.state);
      const userStreetAddress1 = this.state.streetAddress1;
      const userStreetAddress2 = this.state.streetAddress2;
      const userCity = this.state.city;
      const userregion = this.state.region;
      const userPostalCode = this.state.postalCode;
      const userCountry = this.state.country;

      let inputError = false;

      const regexPostalCode = /^\d{5}$/;
      const regexCity = /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/;


      if (!userStreetAddress1) {
        this.handleError('Required field', 'streetAddress 1');
        inputError = true;
      }

      if (!userCity) {
        this.handleError('Required field', 'city');
        inputError = true;
      }

      if (!userregion) {
        this.handleError('Required field, Choose one', 'region');
        inputError = true;
      }

      if (!userPostalCode) {
        this.handleError('Required field', 'postalCode');
        inputError = true;
      } else if (!regexPostalCode.test(userPostalCode)) {
        this.handleError('"postalCode" must be a 5 digit US Zipcode', 'postalCode');
        inputError = true;
      }

      if (!userCountry) {
        this.handleError('Required field', 'country');
        inputError = true;
      }

      return inputError;
      
    });
  }

  doSubmit = async () => {

    //create a contact if there isnt one on the user currently and then add it in 
    
    //need to check if there is an existing contact
    //if there is an existing contact then update that contact
    //let contacts = await PrimeTrustInterface.getContacts();
    
    //create a new contact
    let contact = this.state.contact;
    console.log(this.state);
    let address = {
      "street-1" : this.state.streetAddress1,
      "street-2" : this.state.streetAddress2,
      "postal-code" : this.state.postalCode,
      "region" : this.state.region,
      "city" : this.state.city,
      "country" : this.state.country
    };
    if(this.state.county == "US") address.region =this.state.region;

    let updatedContact = {};
    if(this.state.contact.contactId != undefined){
      console.log("Updated existing contact",this.state.contact.contactId,
      contact.email,
      contact.name,
      contact.dob,
      contact.gender,
      contact.ssn,
      contact.taxCountry,
      contact.phoneCountry,
      contact.phoneNumber,address);
      updatedContact = await PrimeTrustInterface.updateUserContact(this.state.contact.contactId,
        contact.email,
        contact.name,
        contact.dob,
        contact.gender,
        contact.ssn,
        contact.taxCountry,
        contact.phoneCountry,
        contact.phoneNumber,address);
        console.log("Updated Contact",updatedContact);
      
    } else {
      console.log("Creating new contact",contact.email,
      contact.name,
      contact.dob,
      contact.gender,
      contact.ssn,
      contact.taxCountry,
      contact.phoneCountry,
      contact.phoneNumber,address);
      updatedContact = await PrimeTrustInterface.createUserContact(contact.email,
        contact.name,
        contact.dob,
        contact.gender,
        contact.ssn,
        contact.taxCountry,
        contact.phoneCountry,
        contact.phoneNumber,address);
  
    }
    if(updatedContact.success){
      console.log("updated Contact result",updatedContact);
      this.props.navigation.navigate("KYCIdentityFotoInfo")

    } else {
      console.log("Errors",updatedContact.errors);
    }
      
    


  };

  render() {
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.mainInputView}>
          <View style={Styles.centralRow}>
            <Badge
              status="success"
              badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="success"
              badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
              containerStyle={Styles.horizontalPaddingBox10}
            />
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
          </View>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <ScrollView>
            <View style={Styles.root}>
              <Input
                label="Street Address 1"
                labelStyle={styles.formLabel}
                onChangeText={(text) => this.setState({ streetAddress1: text })}
                value={this.state.streetAddress1}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View style={Styles.root}>

              <Input
                label="Street Address 2"
                labelStyle={styles.formLabel}

                onChangeText={(text) => this.setState({ streetAddress2: text })}
                value={this.state.streetAddress2}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <Input
                label="City"
                labelStyle={styles.fromLabel}

                onChangeText={(text) => this.setState({ city: text })}
                value={this.state.city}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <View style={styles.dropdownInput}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="State: "
                  labelTextStyle={{ fontFamily: 'Avenir-Book'}}
                  labelFontSize={13}
                  data={STATES}
                  onChangeText={(value) => this.setState({ region: value })}
                  textColor={Colors.quaternaryColor}
                  selectedItemColor={Colors.quaternaryColor}
                  baseColor={Colors.quaternaryColor}
                  value={this.state.region == null? 'N/A': this.state.region}
                  inputContainerStyle={styles.dropdownInputContainer}
                  pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                />
              </View>
            </View>
            <View>
              <Input
                label="Postal Code"
                labelStyle={styles.formLabel}

                onChangeText={(text) => this.setState({ postalCode: text })}
                value={this.state.postalCode}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <View style={styles.dropdownInput}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="Country: "
                  labelTextStyle={{ fontWeight: '700' }}
                  labelFontSize={13}
                  data={PRIMETRUST_COUNTRIES}
                  onChangeText={(value) => this.setState({ country: value })}
                  textColor={Colors.quaternaryColor}
                  selectedItemColor={Colors.quaternaryColor}
                  baseColor={Colors.quaternaryColor}
                  value={this.state.country ? `${this.state.country}` : ''}
                  inputContainerStyle={styles.dropdownInputContainer}
                  pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                />
              </View>
            </View>
            <View style={styles.buttonContainerBottom}>
            <Button
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.defaultButtonClearWhite}
              title="SUBMIT"
              onPress={()=>{
                this.handleSubmit();
              } }
            />
            <Button
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.defaultButtonClearWhite}
              title="CHEAT TO NEXT SCREEN"
              onPress={()=>{
                this.props.navigation.navigate("KYCphotoAddress")
              }
              }
            />
            </View>
            </ScrollView>
          </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyrePutAccountIsFetching(state),
  individualResidenceAddress: selectWyreAccountField(state, 'individualResidenceAddress'),
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(KYCAddressInput);
