/*
  This component serves as a gateway to the FIAT on/off ramp features.
  Based on the answer to the "What Country?" question, this will either
  let a user through to the fiat gateway registration process or deny
  them entry (if their country is incompatible with fiat on/off ramp framework).
*/

import React, { Component } from "react";
import Button1 from "../../../../symbols/button1";
import { 
  View, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { SUPPORTED_COUNTRIES } from '../../../../utils/constants'
import { saveBuySellSettings } from '../../../../actions/actionCreators'
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import styles from './SelectCountry.styles'
import CountryPicker from 'react-native-country-picker-modal';

class SelectCountry extends Component {
  constructor() {
    super();
    this.state = {
      countryCode: ''
    };
  }

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  handleSubmit = () => {
    const selectedCountry = this.state.countryCode

    if (!SUPPORTED_COUNTRIES.includes(selectedCountry)) {
      this.handleUnsupportedCountry()
    } else {
      //Handle wyre registration process here
    }
  }

  handleUnsupportedCountry = () => {
    if (await this.canTurnOffBuySellForUser()) {
      this.props.dispatch(saveBuySellSettings({buySellEnabled: false}, this.props.activeAccount.id))
      this.back()
      Alert.alert("Setting Saved", `Buy/Sell buttons will no longer be visible for user ${this.props.activeAccount.id}. To re-enable, go to settings.`)
    }
  }

  canTurnOffBuySellForUser = async () => {
    return AlertAsync(
      'Unsupported Country',
      'The country you have selected is currently not supported for cryptocurrency buying and selling. Would you like to ' + 
      'remove the buy/sell buttons within Verus Mobile for this user account? (You can always change this later in settings)',
      [
        {
          text: 'Cancel',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes, remove buy/sell buttons', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <ScrollView contentContainerStyle={{paddingTop: "30%", alignItems: "center", justifyContent: "flex-start"}}>
            <Text style={styles.mainLabel}>
              {"Select your country..."}
            </Text>
            <CountryPicker 
              countryCode={this.state.countryCode}
              translation={'eng'}
              withAlphaFilter
              withFilter
              onSelect={(country) => {this.setState({countryCode: country})}}
            />
          </ScrollView>
          <View style={styles.bottom}>
            <View style={styles.buttonContainer}>
              <Button1 
                style={styles.backButton} 
                buttonContent="Back" 
                onPress={this.back}
              />
              <Button1 
                style={styles.saveChangesButton} 
                buttonContent="Confirm" 
                onPress={this.handleSubmit}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    buySellSettings: state.settings.buySellSettings,
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(SelectCountry);

