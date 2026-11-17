/*
  This component allows you to modify coin-specific wallet settings
  for each coin. This includes things like level of UTXO verification,
  which would be locked to max for coins with custom electrum servers.
*/

import React, { Component } from "react";
import {Keyboard} from "react-native";
import {RadioButton} from 'react-native-paper'
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
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';

class CoinSettings extends Component {
  constructor(props) {
    super(props);
    this.coinID = this.props.route.params.data
    this.verificationLock = this.props.coinSettings[this.coinID].verificationLock

    if (this.props.coinSettings.hasOwnProperty(this.coinID)) {
      this.state = {
        ...this.props.coinSettings[this.coinID],
        errors: { verificationLvl: false },
        loading: false,
        saveError: null,
      }
    } else {
      this.state = {
        verificationLvl: MAX_VERIFICATION,
        errors: { verificationLvl: false },
        loading: false,
        saveError: null,
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
    this.setState({verificationLvl: verificationLvl, saveError: null})
  }

  // A saved level returns to the previous screen. A failure shows on the
  // chosen row.
  saveSettings = () => {
    this.setState({ loading: true, saveError: null }, () => {
      const stateToSave = {
        verificationLvl: this.state.verificationLvl,
      }
      saveCoinSettings(stateToSave, this.coinID)
      .then(res => {
        this.props.dispatch(res)
        this.setState({ ...this.props.coinSettings[this.coinID], loading: false })
        this.back()
      })
      .catch(err => {
        console.warn(err.message)
        this.setState({ loading: false, saveError: "Not saved. Try again." })
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
    const verificationOptions = [
      {label: 'Low', value: NO_VERIFICATION},
      {label: 'Mid', value: MID_VERIFICATION},
      {label: 'High', value: MAX_VERIFICATION},
    ];
    const description = this.verificationLock
      ? VERIFICATION_LOCKED
      : this.state.verificationLvl === NO_VERIFICATION
      ? NO_VERIFICATION_DESC
      : this.state.verificationLvl === MID_VERIFICATION
      ? MID_VERIFICATION_DESC
      : MAX_VERIFICATION_DESC;

    return (
      <SettingsScreen
        footer={
          <SettingsActionFooter
            busy={this.state.loading}
            busyLabel="Saving verification level…"
            primaryLabel="Confirm"
            primaryOnPress={this._handleSubmit}
            secondaryDisabled={this.state.loading}
            secondaryLabel="Back"
            secondaryOnPress={this.back}
          />
        }
        testID="settings.coin">
        <SettingsSection title="Electrum transaction verification">
          {verificationOptions.map((option, index) => {
            const selected = this.state.verificationLvl === option.value;

            return (
              <SettingsRow
                accessibilityRole="radio"
                accessibilityState={{checked: selected}}
                choice
                disabled={this.verificationLock}
                error={selected ? this.state.saveError : null}
                hideDivider={
                  selected ||
                  this.state.verificationLvl === verificationOptions[index + 1]?.value
                }
                icon="shield-check-outline"
                key={option.value}
                last={index === verificationOptions.length - 1}
                onPress={() => this.updateIndex(option.value)}
                selected={selected}
                title={option.label}
                trailing={
                  <RadioButton
                    disabled={this.verificationLock}
                    onPress={() => this.updateIndex(option.value)}
                    status={selected ? 'checked' : 'unchecked'}
                    value={option.value}
                  />
                }
              />
            );
          })}
        </SettingsSection>
        <SettingsNotice
          body={description}
          icon={this.verificationLock ? 'lock-outline' : 'information-outline'}
          title={this.verificationLock ? 'Verification locked' : 'What this changes'}
        />
      </SettingsScreen>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(CoinSettings);
