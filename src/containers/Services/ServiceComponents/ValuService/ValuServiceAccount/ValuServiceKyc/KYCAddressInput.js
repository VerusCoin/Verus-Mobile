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
//import { Dropdown } from 'react-native-material-dropdown';
import Spinner from 'react-native-loading-spinner-overlay';
import { Button, Badge } from 'react-native-elements';
import { TextInput, HelperText} from 'react-native-paper'
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";

import Styles from '../../../../../../styles/index';
import { topProgress } from "./ValuBadgeProgress"

import Colors from '../../../../../../globals/colors';
import ValuProvider from '../../../../../../utils/services/ValuProvider';
import { Button as ElementButton } from 'react-native-elements';
import { updateKYCStage } from '../../../../../../actions/actions/services/dispatchers/valu/updates';
import { setValuAccountStage } from "../../../../../../actions/actionCreators";

class KYCAddressInput extends Component {
  constructor(props) {
    super(props);

    this.state= {
      streetAddress1: null,
      streetAddress2: null,
      city: null,
      region: null,
      postalCode: null,
      country: null,
      contact: null,
      email: null,
      errors: {
        streetAddress1: null,
        streetAddress2: null,
        city: null,
        region: null,
        postalCode: null,
        country: null,
      },
    };
        
  }

  componentDidMount() {
    const { contact, email } = this.props.route.params;

    if (contact)
      this.setState({ contact: contact })
    if (email)
      this.setState({ email: email })

    this.getExisitingAddressess();
  }

  getExisitingAddressess = () => {
    console.log("acount info", this.props.accountId)
    ValuProvider.getAccount(this.props.accountId).then((data) => {

      if(data.data.address != undefined){
        //set any updated fields
        let existingAddress = data.data.address;


        if(existingAddress["street-1"] != "static-string"){
          if(this.state.streetAddress1 == undefined) this.setState({streetAddress1 : existingAddress["street-1"]});
          if(this.state.streetAddress2 == undefined) this.setState({streetAddress2 : existingAddress["street-2"]});
          if(this.state.city == undefined) this.setState({city : existingAddress["city"]});
          if(this.state.region == undefined) this.setState({region : existingAddress["region"]});
          if(this.state.postalCode == undefined) this.setState({postalCode : existingAddress["postal-code"]});
          if(this.state.country == undefined) this.setState({country : existingAddress["country"]});
         }
      }
   
    })
    .catch((e) => console.log(e));

  }

  handleSubmit = () => {
    Keyboard.dismiss();
    if(!this.validateFormData()){
      
        this.doSubmit();
    } 
  };

  validateFormData = () => {

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

      const errors = {};

      let inputError = false;

      const regexPostalCode = /^\d{5}$/;
      const regexCity = /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/;


      if (!this.state.streetAddress1) {
        errors.streetAddress1 = 'Required field';
        inputError = true;
      }

      if (!this.state.city) {
        errors.city = 'Required field';
        inputError = true;
      }

      if (!this.state.region) {
        errors.region = 'Required field';
        inputError = true;
      }

      if (!this.state.postalCode) {
        errors.postalCode = 'Required field';
        inputError = true;
      }/* else if (!regexPostalCode.test(userPostalCode)) {
        this.handleError('"postalCode" must be a 5 digit US Zipcode', 'postalCode');
        inputError = true;
      }*/

      return inputError;
      
    });
  }

  doSubmit = async () => {

    //create a contact if there isnt one on the user currently and then add it in 
  
    let contact = this.state.contact;
    let email = this.state.email;

    let address = {
      "street-1" : this.state.streetAddress1,
      "street-2" : this.state.streetAddress2,
      "postal-code" : this.state.postalCode,
      "region" : this.state.region,
      "city" : this.state.city,
      "country" : contact.taxCountry.key
    };

    if (!address["street-2"])
      delete address["street-2"]

    if(address?.taxCountry?.key) address.country = address?.taxCountry?.key;

    let updatedContact = {};

      updatedContact = await ValuProvider.updateUserContact(
        {accountId: this.props.accountId,
        email: email,
        name: contact.name,
        date_of_birth: contact.dob,
        sex: contact.gender,
        tax_id_number: contact.ssn,
        tax_country: contact.taxCountry.key,
        primary_phone_country: contact.phoneCountry,
        primary_phone_number: contact.phoneNumber,
        primary_address: address});
     
    
    if(updatedContact.success){

      await updateKYCStage(2);
      this.props.dispatch(setValuAccountStage(2));

      this.props.navigation.navigate("KYCIdentityFotoInfo")

    } else {

      await createAlert("Error", `Failed to create VALU OnRamp account. ${updatedContact.error}.`, [
        {
          text: "Try again",
          onPress: async () => {
            resolveAlert(true);
          },
        },
        { text: "Ok", onPress: () => resolveAlert(false) },
      ]);

    }
      
    


  };

  render() {
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={Styles.mainInputView}>
          <View style={Styles.centralRow}>
          {topProgress(1)}
          </View>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <ScrollView>
            <View style={Styles.root}>
            <TextInput
              returnKeyType="done"
              label="Street Address 1"
              value={this.state.streetAddress1}
              mode={"outlined"}
              onChangeText={(text) => this.setState({ streetAddress1: text })}
              autoCapitalize={"none"}
              error={this.state.errors.streetAddress1}
            />
            <HelperText type="error" visible={this.state.errors.streetAddress1}>{this.state.errors.streetAddress1}</HelperText>

            <TextInput
              returnKeyType="done"
              label="Street Address 2"
              value={this.state.streetAddress2}
              mode={"outlined"}
              onChangeText={(text) => this.setState({ streetAddress2: text })}
              autoCapitalize={"none"}
              error={this.state.errors.streetAddress2}
            />
            <HelperText type="error" visible={this.state.errors.streetAddress2}>{this.state.errors.streetAddress2}</HelperText>
            <TextInput
              returnKeyType="done"
              label="City"
              value={this.state.city}
              mode={"outlined"}
              onChangeText={(text) => this.setState({ city: text })}
              autoCapitalize={"none"}
              error={this.state.errors.city}
            />
            <HelperText type="error" visible={this.state.errors.city}>{this.state.errors.city}</HelperText>
            <TextInput
              returnKeyType="done"
              label="State / Region"
              value={this.state.region}
              mode={"outlined"}
              onChangeText={(text) => this.setState({ region: text })}
              autoCapitalize={"none"}
              error={this.state.errors.region}
            />
            <HelperText type="error" visible={this.state.errors.region}>{this.state.errors.region}</HelperText>
            <TextInput

                returnKeyType="done"
                label="Postal / ZIP Code"
                value={this.state.postalCode}
                mode={"outlined"}
                onChangeText={(text) => this.setState({ postalCode: text })}
                autoCapitalize={"none"}
                error={this.state.errors.postalCode}
                />
            <HelperText type="error" visible={this.state.errors.postalCode}>{this.state.errors.postalCode}</HelperText>
            </View>

            <View style={styles.buttonContainerBottom}>
            <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:20} }
                title="SUBMIT"
                onPress={()=>{
                  this.handleSubmit();
                } }
              />

            </View>
            </ScrollView>
          </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
//  console.log("acount info", state.channelStore_valu_service)
  return {
  email: state.channelStore_valu_service.email,
  accountId: state.channelStore_valu_service.accountId

}};



export default connect(mapStateToProps)(KYCAddressInput);
