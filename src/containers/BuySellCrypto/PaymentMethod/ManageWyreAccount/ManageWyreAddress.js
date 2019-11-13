import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  Text,
  View,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements';
import { Dropdown } from 'react-native-material-dropdown';
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
import { STATES, SUPPORTED_COUNTRIES } from '../../../../utils/constants';

const COUNTRIES = [{ value: SUPPORTED_COUNTRIES }];

class ManageWyreAddress extends Component {
  constructor(props) {
    super(props);
    const individualAddress = this.props.individualResidenceAddress.value || {};
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
        state: this.state.state,
        postalCode: this.state.postalCode,
        country: this.state.country,
      }
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
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                    Street Address:
              </FormLabel>
              <FormInput
                underlineColorAndroid="#86939d"
                onChangeText={(text) => this.setState({ streetAddress: text })}
                value={this.state.streetAddress}
                autoCorrect={false}
                inputStyle={{ width: 300 }}
              />
              <FormValidationMessage>
                {this.state.errors.streetAddress}
              </FormValidationMessage>
            </View>
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                    City:
              </FormLabel>
              <FormInput
                underlineColorAndroid="#86939d"
                onChangeText={(text) => this.setState({ city: text })}
                value={this.state.city}
                autoCorrect={false}
                inputStyle={{ width: 300 }}
              />
              <FormValidationMessage>
                {this.state.errors.city}
              </FormValidationMessage>
            </View>
            <View>
              <View style={styles.dropdownInput}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="State: "
                  labelTextStyle={{ fontWeight: '700', paddingBottom: 20 }}
                  labelFontSize={13}
                  data={STATES}
                  onChangeText={(value) => this.setState({ countryState: value })}
                  textColor="#86939e"
                  selectedItemColor="#232323"
                  baseColor="#86939e"
                  value={this.state.countryState}
                />
              </View>
              <FormValidationMessage>
                {this.state.errors.countryState}
              </FormValidationMessage>
            </View>
            <View>
              <FormLabel labelStyle={styles.formLabel}>
                    Postal Code:
              </FormLabel>
              <FormInput
                underlineColorAndroid="#86939d"
                onChangeText={(text) => this.setState({ postalCode: text })}
                value={this.state.postalCode}
                autoCorrect={false}
                inputStyle={{ width: 300 }}
              />
              <FormValidationMessage>
                {this.state.errors.postalCode}
              </FormValidationMessage>
            </View>
            <View>
              <View style={styles.dropdownInput}>
                <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item}
                  label="Country: "
                  labelTextStyle={{ fontWeight: '700', paddingBottom: 20 }}
                  labelFontSize={13}
                  data={COUNTRIES}
                  onChangeText={(value) => this.setState({ country: value })}
                  textColor="#86939e"
                  selectedItemColor="#232323"
                  baseColor="#86939e"
                  value={this.state.country ? `${this.state.country}` : ''}
                />
              </View>
              <FormValidationMessage>
                {this.state.errors.country}
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
  individualResidenceAddress: selectWyreAccountField(state, 'individualResidenceAddress'),
});

const mapDispatchToProps = ({
  putWyreAccountField,
});

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreAddress);
