/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size, what level of UTXO verification they want, and the 
  option to clear the cache.
*/

import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage, ButtonGroup } from 'react-native-elements'
import { saveWalletSettings } from '../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { clearCacheData } from '../actions/actionCreators'

const NO_VERIFICATION = 0
const MID_VERIFICATION = 1
const MAX_VERIFICATION = 2

class WalletSettings extends Component {
  constructor(props) {
    super(props);

    if (this.props.walletSettingsState.hasOwnProperty("maxTxCount")) {
      this.state = this.props.walletSettingsState
    } else {
      this.state = {
        maxTxCount: "10",
        utxoVerificationLvl: 2,
        errors: { maxTxCount: false, utxoVerificationLvl: false },
        loading: false
      };
    }
    
    this.updateIndex = this.updateIndex.bind(this)
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  updateIndex(utxoVerificationLvl) {
    this.setState({utxoVerificationLvl: utxoVerificationLvl})
  }

  saveSettings = () => {
    this.setState({ loading: true }, () => {
      const stateToSave = {
        maxTxCount: this.state.maxTxCount,
        utxoVerificationLvl: this.state.utxoVerificationLvl,
        errors: { maxTxCount: false, utxoVerificationLvl: false },
        loading: false
      }
      saveWalletSettings(stateToSave)
      .then(res => {
        this.props.dispatch(res)
        this.setState(this.props.walletSettingsState)
        Alert.alert("Success", "Settings saved")
      })
      .catch(err => {
        Alert.alert("Error", err.message)
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

  validateFormData = () => {
    this.setState({
      errors: {maxTxCount: null, utxoVerificationLvl: null}
    }, () => {
      let _errors = false
      const _maxTxCount = this.state.maxTxCount

      if (!_maxTxCount || _maxTxCount.length === 0 || isNaN(_maxTxCount) || Number(_maxTxCount) < 10 || Number(_maxTxCount) > 100) {
        this.handleError("Please enter a valid number from 10 to 100", "maxTxCount")
        _errors = true
      }

      if (!_errors) {
        this.saveSettings()
      } 
    });
  }

  render() {
    const utxoVerificationBtns = ['Low', 'Mid', 'High']

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.mainHeader}>
            {"Wallet Settings:"}
          </Text>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Maximum Displayed Transaction Count:
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({maxTxCount: text})}
              value={this.state.maxTxCount}
              shake={this.state.errors.maxTxCount}
              inputStyle={styles.formInput}
              keyboardType={'number-pad'}
            />
            <FormValidationMessage>
            {
              this.state.errors.maxTxCount ? 
                this.state.errors.maxTxCount
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
              {"Level of UTXO verification:"}
            </FormLabel>
            <ButtonGroup
              onPress={this.updateIndex}
              selectedIndex={this.state.utxoVerificationLvl}
              buttons={utxoVerificationBtns}
              selectedButtonStyle={{backgroundColor: "#7c858f", containerBorderRadius: "0"}}
              selectedTextStyle={{color: "#f5f5f5"}}
            />
            <FormLabel labelStyle={styles.utxoVerificationDesc}>
              { this.state.utxoVerificationLvl === NO_VERIFICATION ? 
                'No Verification (Not recommended):\nOn this setting, before sending a transaction, none of your funds will be ' +
                'cross-verified across different electrum servers, and your existing transactions will not be ' +
                'hashed to check against their transaction id. This is only suggested for huge wallets that ' +
                'otherwise wouldn\'t be able to send.'
                :
                this.state.utxoVerificationLvl === MID_VERIFICATION ? 
                  'Incomplete Verification (Not recommended):\nOn this setting, your funds will not be cross verified across multiple ' + 
                  'servers, but you may experience a little quicker transaction sending times. This is not recommended unless ' +
                  'necessary for usability.'
                  :
                  'Complete Verification (Highly recommended):\nOn this setting, before sending a transaction, your funds will be ' +
                  'cross verified across at least two different electrum servers, and the transaction IDs of your existing ' +
                  'transactions will be double-checked through local transaction hashing.'}
            </FormLabel>
          </View>
          {this.state.loading ? 
            <ActivityIndicator animating={this.state.loading} size="large"/>
          :
            <View style={styles.buttonContainer}>
              <Button1 
                style={styles.backButton} 
                buttonContent="Back" 
                onPress={this.back}
              />
              <Button1 
                style={styles.saveChangesButton} 
                buttonContent="Confirm" 
                onPress={this._handleSubmit}
              />
            </View>
          }
        </ScrollView>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    walletSettingsState: state.settings.walletSettingsState,
  }
};

export default connect(mapStateToProps)(WalletSettings);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  keyGenLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  mainHeader: {
    backgroundColor: "transparent",
    marginTop: 30,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72"
  },
  buttonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveChangesButton: {
    height: 46,
    backgroundColor: "#009B72",
    marginTop: 15,
    marginBottom: 40
  },
  clearCacheButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 25,
    marginBottom: 25
  },
  backButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
  utxoVerificationDesc: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
});