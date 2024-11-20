/*
  This component allows you to modify coin-specific wallet settings
  for each coin. This includes things like level of UTXO verification,
  which would be locked to max for coins with custom electrum servers.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  ScrollView, 
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { List, Button, RadioButton, Divider, Paragraph } from 'react-native-paper'
import { NavigationActions } from '@react-navigation/compat';
import { saveCoinSettings } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import { 
  NO_VERIFICATION,
  MID_VERIFICATION,
  MAX_VERIFICATION,
  NO_VERIFICATION_DESC,
  MID_VERIFICATION_DESC,
  MAX_VERIFICATION_DESC,
  VERIFICATION_LOCKED
} from '../../../../utils/constants/constants'
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors';
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";

class CoinSettings extends Component {
  constructor(props) {
    super(props);
    this.coinID = this.props.route.params.data
    this.verificationLock = this.props.coinSettings[this.coinID].verificationLock

    if (this.props.coinSettings.hasOwnProperty(this.coinID)) {
      this.state = {
        ...this.props.coinSettings[this.coinID],
        errors: { verificationLvl: false },
        loading: false
      }
    } else {
      this.state = {
        verificationLvl: MAX_VERIFICATION,
        errors: { verificationLvl: false },
        loading: false
      };
    }
    
    this.updateIndex = this.updateIndex.bind(this)
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: typeof(route.params)==='undefined' || 
      typeof(route.params.title) === 'undefined' ? 
      'undefined': `${route.params.title} Settings`,
    };
  };

  updateIndex(verificationLvl) {
    this.setState({verificationLvl: verificationLvl})
  }

  saveSettings = () => {
    this.setState({ loading: true }, () => {
      const stateToSave = {
        verificationLvl: this.state.verificationLvl,
      }
      saveCoinSettings(stateToSave, this.coinID)
      .then(res => {
        this.props.dispatch(res)
        this.setState({ ...this.props.coinSettings[this.coinID], loading: false })
        createAlert("Success", `${this.coinID} settings saved.`)
      })
      .catch(err => {
        createAlert("Error", err.message)
        console.warn(err.message)
        this.setState({ loading: false })
      })
    })
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  //TODO: Add more to this when more options are added
  validateFormData = () => {
    this.setState({
      errors: {verificationLvl: null}
    }, () => {
      let _errors = false

      if (!_errors) {
        this.saveSettings()
      } 
    });
  }

  render() {
    const utxoVerificationBtns = ['Low', 'Mid', 'High']

    return (
      <View style={Styles.defaultRoot}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
          }}
        >
          <View style={Styles.fullWidth}>
            <List.Subheader>{"Electrum Transaction Verification"}</List.Subheader>
            <Divider />
              <RadioButton.Group
                onValueChange={
                  this.verificationLock
                    ? () => {}
                    : (newValue) => this.updateIndex(newValue)
                }
                value={this.state.verificationLvl}
              >
                <RadioButton.Item
                  color={Colors.primaryColor}
                  label={utxoVerificationBtns[0]}
                  value={0}
                  mode="android"
                />
                <RadioButton.Item
                  color={Colors.primaryColor}
                  label={utxoVerificationBtns[1]}
                  value={1}
                  mode="android"
                />
                <RadioButton.Item
                  color={Colors.primaryColor}
                  label={utxoVerificationBtns[2]}
                  value={2}
                  mode="android"
                />
              </RadioButton.Group>
            <Divider />
            <View style={Styles.wideCenterBlock}>
              <Paragraph>
                {this.verificationLock
                  ? VERIFICATION_LOCKED
                  : this.state.verificationLvl === NO_VERIFICATION
                  ? NO_VERIFICATION_DESC
                  : this.state.verificationLvl === MID_VERIFICATION
                  ? MID_VERIFICATION_DESC
                  : MAX_VERIFICATION_DESC}
              </Paragraph>
            </View>
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button
              buttonColor={Colors.warningButtonColor}
              textColor={Colors.secondaryColor}
              onPress={this.back}
              disabled={this.state.loading}
            >{"Back"}</Button>
            <Button
              textColor={Colors.linkButtonColor}
              onPress={this._handleSubmit}
              disabled={this.state.loading}
            >{"Confirm"}</Button>
          </View>
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(CoinSettings);

