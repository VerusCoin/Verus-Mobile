import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard
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
import { STATES, WYRE_COUNTRIES } from '../../../../utils/constants/constants';
import Colors from '../../../../globals/colors';


class KYCAddressInput extends Component {
  constructor(props) {
    super(props);

    const individualAddress = typeof this.props.individualResidenceAddress === 'undefined' ? {} : this.props.individualResidenceAddress.value;

    this.state = {
      streetAddress: individualAddress.street1,
      city: individualAddress.city,
      countryState: individualAddress.state,
      postalCode: individualAddress.postalCode,
      country: individualAddress.country,
      errors: {
        streetAddress: null,
        city: null,
        countryState: null,
        postalCode: null,
        country: null,
      },

    };
  }

  handleError = (error, field) => {
    const displayError = this.state.errors;
    displayError[field] = error;
    this.setState({ errors: displayError });
  }

  handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  validateFormData = () => {
    this.setState({
      errors: {
        streetAddress: null,
        city: null,
        countryState: null,
        postalCode: null,
        country: null,
      },
    }, () => {
      const userStreetAddress = this.state.streetAddress;
      const userCity = this.state.city;
      const userCountryState = this.state.countryState;
      const userPostalCode = this.state.postalCode;
      const userCountry = this.state.country;

      let inputError = false;

      const regexPostalCode = /^\d{5}$/;
      const regexCity = /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/;


      if (!userStreetAddress) {
        this.handleError('Required field', 'streetAddress');
        inputError = true;
      }

      if (!userCity) {
        this.handleError('Required field', 'city');
        inputError = true;
      }

      if (!userCountryState) {
        this.handleError('Required field, Choose one', 'countryState');
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

      if (!inputError) {
        this.doSubmit();
      }
    });
  }

  doSubmit = async () => {
    this.props.putWyreAccountField([{
      fieldId: 'individualResidenceAddress',
      value: {
        street1: this.state.streetAddress,
        city: this.state.city,
        state: this.state.countryState,
        postalCode: this.state.postalCode,
        country: this.state.country,
      }
    }], this.props.navigation);
  };

  render() {
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.mainInputView}>
          <View style={{...Styles.centralRow, ...Styles.padding}}>
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
            <View style={Styles.padding}>
              <View>
              <Input
                label="Street Address"
                labelStyle={Styles.formLabel}
                containerStyle={Styles.wideCenterBlock}
                onChangeText={(text) => this.setState({ streetAddress: text })}
                value={this.state.streetAddress}
                autoCorrect={false}
                inputStyle={Styles.inputTextDefaultStyle}
              />
            </View>
            <View>
              <Input
                label="City"
                labelStyle={Styles.formLabel}
                containerStyle={Styles.wideCenterBlock}
                onChangeText={(text) => this.setState({ city: text })}
                value={this.state.city}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <View style={{padding: 10}}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="State: "
                  labelTextStyle={Styles.formLabel}
                  labelFontSize={13}
                  data={STATES}
                  onChangeText={(value) => this.setState({ countryState: value })}
                  textColor={Colors.quaternaryColor}
                  selectedItemColor={Colors.quaternaryColor}
                  baseColor={Colors.quaternaryColor}
                  value={this.state.countryState}
                  containerStyle={Styles.wideCenterBlock}
                  pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                />
              </View>
            </View>
            <View>
              <Input
                label="postal Code"
                labelStyle={Styles.formLabel}
                containerStyle={Styles.wideCenterBlock}
                onChangeText={(text) => this.setState({ postalCode: text })}
                value={this.state.postalCode}
                autoCorrect={false}
                inputStyle={styles.formInputContainer}
              />
            </View>
            <View>
              <View style={{padding: 10}}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="Country: "
                  labelTextStyle={Styles.formLabel}
                  labelFontSize={13}
                  data={WYRE_COUNTRIES}
                  onChangeText={(value) => this.setState({ country: value })}
                  textColor={Colors.quaternaryColor}
                  selectedItemColor={Colors.quaternaryColor}
                  baseColor={Colors.quaternaryColor}
                  value={this.state.country ? `${this.state.country}` : ''}
                  containerStyle={Styles.wideCenterBlock}
                  pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                />
              </View>
            </View>
            </View>
            <View style={styles.buttonContainerBottom}>
              <Button
              titleStyle={Styles.whiteText}
              buttonStyle={Styles.defaultButtonClearWhite}
                title="CHEAT TO NEXT SCREEN"
                onPress={()=>{
                  this.props.navigation.navigate("KYCphotoAddress")
                }
                }
              />
            <Button
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.defaultButtonClearWhite}
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

const mapStateToProps = (state) => ({
  isFetching: selectWyrePutAccountIsFetching(state),
  individualResidenceAddress: selectWyreAccountField(state, 'individualResidenceAddress'),
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(KYCAddressInput);
