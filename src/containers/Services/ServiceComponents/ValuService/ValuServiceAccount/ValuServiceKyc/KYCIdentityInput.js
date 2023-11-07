import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Portal, RadioButton, Dialog, Button, HelperText } from 'react-native-paper'
import { Icon, Button as ElementButton } from 'react-native-elements';
import { ISO_3166_COUNTRIES } from "../../../../../../utils/constants/iso3166";
import ListSelectionModal from "../../../../../../components/ListSelectionModal/ListSelectionModal";
import Spinner from 'react-native-loading-spinner-overlay';
import PhoneNumberModal from "../../../../../../components/PhoneNumberModal/PhoneNumberModal";

import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';
import { topProgress } from "./ValuBadgeProgress"

import TextInputMask from 'react-native-text-input-mask';
import DatePickerModal from "../../../../../../components/DatePickerModal/DatePickerModal";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from '../../../../../../images/customIcons/index';
import { parseDate } from '../../../../../../utils/date';
import { VALU_SERVICE_ID } from "../../../../../../utils/constants/services";
import { STATES, VALU_COUNTRIES } from '../../../../../../utils/constants/constants';
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import ValuProvider from '../../../../../../utils/services/ValuProvider';
import { setServiceLoading } from "../../../../../../actions/actionCreators";
import moment from "moment";
class KYCIdentityInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: null,
      email: null,
      dateOfBirth: null,
      country: {
        key: null,
        title: null
      },
      socialSecurityNumber: null,
      gender: null,
      phoneNumber: { "calling_code": null, "number": null, "type": null },
      errors: {
        name: null,
        dateOfBirth: null,
        gender: null,
        socialSecurityNumber: null,
        phone: null,
        country: null
      },
      date: new Date(),
      mode: 'date',
      showCalendar: false,
      dobSelectorModalOpen: false,
      showGenderPicker: false,
      currentPhoneNumberModal: null,
      countryModalOpen: false,
      supportedCountries: [],
    };

  }

  componentDidMount() {
    this.loadValuAccount();
    this.initSupportedCountries();
  }


  async loadValuAccount() {

    try {
      this.props.dispatch(setServiceLoading(true, VALU_SERVICE_ID))

      console.log("this.props.accountId:", this.props.accountId);
      const account = await ValuProvider.getAccount(this.props.accountId);
      console.log("this.props.account:", account);
      if (account.data?.included[0].type === "contacts") {
        let existingContact = account.data.included[0];


        this.setState({ contactId: existingContact.id });

        if (this.state.email == null) this.setState({ email: existingContact.attributes["email"] });
        if (this.state.name == null) this.setState({ name: existingContact.attributes["name"] });
        if (this.state.country.key == null) {
          const country = { key: existingContact.attributes["tax-country"], title: existingContact.attributes["tax-country"] }
          this.setState({ country: country });
        }

        if (this.state.socialSecurityNumber == null) this.setState({
          socialSecurityNumber: existingContact.attributes["tax-id-number"] ==
            "123456789" ? null : existingContact.attributes["tax-id-number"]
        });

        if (this.state.gender == null) this.setState({ gender: existingContact.attributes["sex"] });

        //retrieve the phone number
        if (account?.data["primary-phone-number"] != "0123456789") { }
        this.setState({ phoneNumber: { number: account.data["primary-phone-number"], "calling_code": " " } });


        if (this.state.dateOfBirth == null) this.setState({
          dateOfBirth: existingContact.attributes["date-of-birth"] ==
            "1980-01-01" ? null : existingContact.attributes["date-of-birth"]
        });

      }



    } catch (e) {
      await createAlert("Error", `Failed to create Valu account. ${e.message}.`, [
        { text: "Ok", onPress: () => resolveAlert(false) },
      ]);
    }
  }

  initSupportedCountries = async () => {
    this.props.dispatch(setServiceLoading(true, VALU_SERVICE_ID))

    try {
      this.getSupportedCountries(() => {
        this.props.dispatch(setServiceLoading(false, VALU_SERVICE_ID))
      });
    } catch (e) {
      console.warn(e);
      createAlert("Error", "Failed to retrieve Valu supported countries.", [
        {
          text: "Try again",
          onPress: async () => {
            await this.initSupportedCountries();
            resolveAlert();
          },
        },
        { text: "Ok", onPress: () => resolveAlert() },
      ]);
    }
  };

  async getSupportedCountries(cb = () => { }) {

    // const returned = await ValuProvider.getSupportedCountries();
    this.setState(
      {
        supportedCountries: ["US"], //returned,
      },
      cb
    );
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

  setDate = (date) => {
    this.setState({
      showCalendar: Platform.OS === 'ios' ? true : false,
    }, () => {

      if (date?.nativeEvent?.timestamp) {
        this.setState({
          dateOfBirth: parseDate(date?.nativeEvent?.timestamp),
          date: date?.nativeEvent?.timestamp
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
        gender: null,
        socialSecurityNumber: null,
        phone: null,
        country: null
      },
    }, () => {

      let inputError = false;
      const regexsocialSecurityNumber = /^([1-9])(?!\1{2}-\1{2}-\1{4})[1-9]{2}-[1-9]{2}-[1-9]{4}$/;
      const errors = {};

      if (!this.state.name) {
        errors.name = 'Required field';
        inputError = true;
      }

      if (!this.state.dateOfBirth) {
        errors.dateOfBirth = 'Required field';
        inputError = true;
      }

      if (!this.state.gender) {
        errors.gender = 'Required field';
        inputError = true;
      }

      if (!this.state.socialSecurityNumber) {
        errors.socialSecurityNumber = 'Required field';
        inputError = true;
      } else if (typeof (this.state.socialSecurityNumber) != "string" || this.state.socialSecurityNumber.toString().length != 9) {
        errors.socialSecurityNumber = '"SSN" must be 9 digits long';
        inputError = true;
      }

      if (!this.state.phoneNumber?.number) {
        errors.phone = 'Required field';
        inputError = true;
      }

      if (!this.state.country?.key) {
        errors.country = 'Required field';
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
    //create a contact for the id

    let contact = {
      name: this.state.name,
      dob: this.state.dateOfBirth,
      gender: this.state.gender,
      ssn: this.state.socialSecurityNumber,
      taxCountry: this.state.country,
      phoneNumber: this.state.phoneNumber
    };

    this.props.navigation.navigate("KYCAddressInput", {
      contact: contact,
      email: this.state.email
    });


  };

  setBirthday(date) {
    this.setState({
      showCalendar: false,
      dateOfBirth: this.getDateClassInstance(
        date.day,
        date.month,
        date.year
      ).toISOString().split('T')[0]
    }, () => {

    })
  }

  getDateClassInstance(day, month, year) {
    return moment({ year, month, day }).toDate()
  }

  openMenu = () => { this.setState({ showGenderPicker: true }); }

  closeMenu = () => this.setState({ showGenderPicker: false });

  setGender = (choice) => this.setState({ gender: choice });

  closeModal() {
    this.setState({ currentPhoneNumberModal: null });
  }


  render() {
    const { onSelect } = this.props;
    return (
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss()
        if (this.state.showCalendar) {
          this.hideCalendar();
        }
      }} accessible={false}>
        <View style={Styles.root}>

          <ScrollView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
            {topProgress(1)}
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />

            <Text
              style={{
                marginVertical: 25,
                textAlign: "left",
                fontSize: 20,
                color: Colors.quinaryColor,
              }}
            >
              {"Enter your personal information"}
            </Text>

            <TextInput
              returnKeyType="done"
              label="Legal Name:"
              value={this.state.name}
              mode={"outlined"}
              placeholder="user1234"
              onChangeText={(text) => this.setState({ name: text })}
              autoCapitalize={"none"}
              error={this.state.errors.name}
            />
            <HelperText type="error" visible={this.state.errors.name}>{this.state.errors.name}</HelperText>
            <View>
              <View style={Styles.containerDateOfBirth}>
                <TouchableOpacity style={{ ...Styles.containerDateOfBirth, marginBottom: 1 }} onPress={() => this.showCalendar()}>
                  <TextInput
                    showSoftInputOnFocus={false}
                    returnKeyType="done"
                    style={{ width: "80%", marginVertical: 1 }}
                    label="Date of Birth:"
                    value={this.state.dateOfBirth}
                    mode={"outlined"}
                    onChangeText={(text) => { }}
                    autoCapitalize={"none"}
                    onFocus={() => { Keyboard.dismiss(); this.showCalendar() }}
                    editable={false}
                    pointerEvents="none"
                    error={this.state.errors.dateOfBirth}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={this.showCalendar}>
                  <View style={{ marginLeft: 10 }}>
                    <Icon reverse type='font-awesome' name="calendar" color={Colors.primaryColor} />
                  </View>
                </TouchableOpacity>

              </View>
              <View>
                {this.state.showCalendar && <DatePickerModal
                  title={"Birthday"}
                  flexHeight={0.5}
                  visible={this.state.showCalendar}
                  initialDate={
                    this.state.date == null
                      ? new Date()
                      : this.getDateClassInstance(
                        this.state.date.day,
                        this.state.date.month,
                        this.state.date.year
                      )
                  }
                  onSelect={(date) => this.setBirthday(date)}
                  onCancel={() => { this.hideCalendar() }}
                />
                }
              </View>
              <HelperText type="error" visible={this.state.errors.dateOfBirth}>{this.state.errors.dateOfBirth}</HelperText>
            </View>
            <View>
              <View pointerEvents="box-none">
                <TouchableOpacity onPress={this.openMenu}>
                  <TextInput
                    returnKeyType="done"
                    label="Choose Gender:"
                    value={this.state.gender}
                    mode={"outlined"}
                    onChangeText={(text) => { }}
                    autoCapitalize={"none"}
                    editable={false}
                    pointerEvents="none"
                    error={this.state.errors.gender}
                  />
                  <HelperText type="error" visible={this.state.errors.gender}>{this.state.errors.gender}</HelperText>
                </TouchableOpacity>
              </View>
            </View>
            <Portal>
              <Dialog visible={this.state.showGenderPicker} onDismiss={this.closeMenu}>
                <Dialog.Title>Select Gender</Dialog.Title>
                <Dialog.Content>
                  <RadioButton.Group onValueChange={newValue => this.setGender(newValue)} value={this.state.gender}>

                    <RadioButton.Item value="male" label={`Male`} />
                    <RadioButton.Item value="female" label={`Female`} />
                    <RadioButton.Item value="other" label={`Other`} />

                  </RadioButton.Group>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={this.closeMenu}>Done</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
            <View>
              <TextInput
                returnKeyType="done"
                label="Social Security / Tax Number:"
                value={this.state.socialSecurityNumber}
                style={{ marginVertical: 1 }}
                mode={"outlined"}
                placeholder="user1234"
                onChangeText={(text) => this.setState({ socialSecurityNumber: text })}
                autoCapitalize={"none"}
                autoCorrect={false}
                error={this.state.errors.socialSecurityNumber}
              />
              <HelperText type="error" visible={this.state.errors.socialSecurityNumber}>{this.state.errors.socialSecurityNumber}</HelperText>
            </View>
            <View style={{ ...Styles.containerDateOfBirth, marginBottom: 1 }}>
              <TouchableOpacity style={{ ...Styles.containerDateOfBirth, marginBottom: 1 }} onPress={() => this.setState({ currentPhoneNumberModal: true })}>
                <TextInput
                  showSoftInputOnFocus={false}
                  returnKeyType="done"
                  label="Phone Number:"
                  value={this.state.phoneNumber?.calling_code ? (this.state.phoneNumber?.calling_code + " " + (this.state.phoneNumber?.number)) : ""}
                  style={{ width: "80%" }}
                  mode={"outlined"}
                  onChangeText={(text) => { }}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  onFocus={() => { Keyboard.dismiss(); this.setState({ currentPhoneNumberModal: true }) }}
                  editable={false}
                  pointerEvents="none"
                  error={this.state.errors.phone}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.setState({ currentPhoneNumberModal: true })}>
                <View style={{ marginLeft: 10 }}>
                  <Icon reverse type='font-awesome' name="phone" color={Colors.primaryColor} />
                </View>
              </TouchableOpacity>

              <View>
              </View>

            </View>
            <HelperText type="error" visible={this.state.errors.phone}>{this.state.errors.phone}</HelperText>
            <Portal>
              {this.state.currentPhoneNumberModal != null && (
                <PhoneNumberModal
                  title={"Phone"}
                  visible={this.state.currentPhoneNumberModal != null}
                  onSelect={(item) => { this.setState({ phoneNumber: item }); this.closeModal() }}
                  cancel={(item) => { this.setState({ phoneNumber: item }); this.closeModal() }}
                />
              )}
            </Portal>
            <TouchableOpacity onPress={() => this.setState({ countryModalOpen: true })}>
              <TextInput
                label="Select your Country of residence"
                value={this.state.country.title}
                mode={"outlined"}
                placeholder="Select your Country of residence"
                editable={false}
                pointerEvents="none"
                error={this.state.errors.country}
              />
              <HelperText type="error" visible={this.state.errors.country}>{this.state.errors.country}</HelperText>
            </TouchableOpacity>
            <Portal>
              {this.state.countryModalOpen && (
                <ListSelectionModal
                  title="Select your Country of residence"
                  flexHeight={0.3}
                  visible={this.state.countryModalOpen}
                  onSelect={(item) => this.setState({ country: item })}
                  data={this.state.supportedCountries.filter(word => ISO_3166_COUNTRIES[word] != undefined).map((code) => {

                    const item = ISO_3166_COUNTRIES[code];
                    // console.log("e:",code);
                    return {
                      key: code,
                      title: `${item?.emoji} ${item?.name}`,
                    };
                  })}
                  cancel={() => this.setState({ countryModalOpen: false })}
                />
              )}
            </Portal>
            <ElementButton
              titleStyle={{ ...Styles.whiteText, fontWeight: 'bold' }}
              buttonStyle={{ backgroundColor: Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15, borderRadius: 20, marginTop: 1 }}
              title="SUBMIT"
              onPress={() => {
                if (this.state.showCalendar) {
                  this.hideCalendar();
                }
                this.handleSubmit();
              }
              }
            />
          </ScrollView>

        </View>

      </TouchableWithoutFeedback>
    );
  }
}

//const mapStateToProps = (state) => ({
//  isFetching: selectWyrePutAccountIsFetching(state),
///  individualLegalName: selectWyreAccountField(state, 'individualLegalName'),
// individualDateOfBirth: selectWyreAccountField(state, 'individualDateOfBirth'),
// individualSsn: selectWyreAccountField(state, 'individualSsn')
//});

const mapStateToProps = (state) => {

  //  console.log(state.channelStore_valu_service)
  return {
    valuScreenParams: state.channelStore_valu_service.currentAccountDataScreenParams || {},
    accountId: state.channelStore_valu_service.accountId
  }
};

export default connect(mapStateToProps)(KYCIdentityInput);
