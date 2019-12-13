/*
  This component represents the screen that the user is met with
  if there is no account present in AsyncStorage. It allows them
  to create an account by using a seed, username and password.
  It is crucial that they understand the importance of their seed.
*/  

import React, { Component } from "react"
import Button1 from "../../symbols/button1"
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  Platform
} from "react-native"
import { NavigationActions } from 'react-navigation'
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'
import { addUser, setUpdateIntervalID } from '../../actions/actionCreators'
import { connect } from 'react-redux'
import { getKey } from '../../utils/keyGenerator/keyGenerator'
import { spacesLeadOrTrail, hasSpecialCharacters } from '../../utils/stringUtils'
import AlertAsync from 'react-native-alert-async'
import ScanSeed from '../../components/ScanSeed'
import styles from './SignUp.styles';
import Colors from '../../globals/colors';

class SignUp extends Component {
  constructor() {
    super();
    this.state = {
      wifKey: null,
      pin: null,
      confirmPin: null,
      wifSaved: false,
      disclaimerRealized: false,
      userName: null,
      errors: {
        userName: null, 
        wifKey: null, 
        pin: null, 
        confirmPin: null,
        wifSaved: null,
        disclaimerRealized: null},
      warnings: [],
      scanning: false
    };
  }

  componentWillMount() {
    if (this.props.updateIntervalID) {
      console.log("Update interval ID detected as " + this.props.updateIntervalID + ", clearing...")
      clearInterval(this.props.updateIntervalID)
      this.props.dispatch(setUpdateIntervalID(null))
    }

    if (this.props.navigation.state.params && this.props.navigation.state.params.data) {
      this.fillSeed(this.props.navigation.state.params.data.seed)
    }
  }
  
  setKey = () => {
    this.setState({wifKey: getKey(24)})
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  handleWarning = (warning) => {
    let _warnings = this.state.warnings
    _warnings.push(warning)

    this.setState({warnings: _warnings})
  }

  duplicateAccount = (accountID) => {
    let index = 0;

    while (index < this.props.accounts.length && accountID !== this.props.accounts[index].id) {
      index++;
    }

    if (index < this.props.accounts.length) {
      return true
    } else {
      return false
    }
  }

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  validateFormData = () => {
    this.setState({
      errors: {
        userName: null, 
        wifKey: null, 
        pin: null, 
        confirmPin: null, 
        wifSaved: null,
        disclaimerRealized: null},
      warnings: []
    }, () => {
      const _userName = this.state.userName
      const _wifKey = this.state.wifKey
      const _pin = this.state.pin
      const _confirmPin = this.state.confirmPin
      const _wifSaved = this.state.wifSaved
      const _disclaimerRealized = this.state.disclaimerRealized
      let _errors = false;
      let _warnings = false;

      if (!_userName || _userName.length < 1) {
        this.handleError("Required field", "userName")
        _errors = true
      } else if (_userName.length > 15) {
        this.handleError("Max character count exceeded", "userName")
        _errors = true
      } else if (this.duplicateAccount(_userName)) {
        this.handleError("Account with this name already exists", "userName")
        _errors = true
      }

      if (!_wifKey || _wifKey.length < 1) {
        this.handleError("Required field", "wifKey")
        _errors = true
      } else if (_wifKey.length < 15) {
        this.handleError("Min. 15 characters", "wifKey")
        _errors = true
      } else if (!hasSpecialCharacters(_wifKey)) {
        this.handleError("Seed cannot include any special characters", "wifKey")
        _errors = true
      } else {
        if (spacesLeadOrTrail(_wifKey)) {
          this.handleWarning(
            "• Seed contains leading or trailing spaces")
          _warnings = true
        }

        if (_wifKey.length < 30) {
          this.handleWarning(
            "• Seed is less than 30 characters, it is recommended that" +
            " you create a long, complex seed, as anyone with access to it " + 
            "will have access to your funds")
          _warnings = true
        }
      }

      if (!_pin || _pin.length < 1) {
        this.handleError("Required field", "pin")
        _errors = true
      } else if (_pin.length < 5) {
        this.handleError("Min 5 characters", "pin")
        _errors = true
      }

      if (_pin !== _confirmPin) {
        this.handleError("Passwords do not match", "confirmPin")
        _errors = true
      }

      if (!_wifSaved) {
        this.handleError("Make sure to save your WIF key", "wifSaved")
        _errors = true
      }

      if (!_disclaimerRealized) {
        this.handleError("Ensure you are aware of the risks of sharing your passphrase/seed", "disclaimerRealized")
        _errors = true
      }

      if (!_errors && !_warnings) {
        addUser(this.state.userName, this.state.wifKey, this.state.pin, this.props.accounts)
        .then((action) => {
          this.props.dispatch(action);
        })
      } else if (!_errors) {
        this.canMakeAccount()
        .then((res) => {
          if (res) {
            addUser(this.state.userName, this.state.wifKey, this.state.pin, this.props.accounts)
            .then((action) => {
              this.props.dispatch(action);
            })
            .catch((e) => {
              console.warn(e)
            })
          } 
        })
        .catch((e) => {
          console.warn(e)
        })
      } 
    });
  }

  scanSeed = () => {
    this.setState({scanning: true})
  }

  turnOffScan = () => {
    this.setState({scanning: false})
  }

  handleScan = (seed) => {
    this.turnOffScan()
    this.setState({wifKey: seed})
  }

  canMakeAccount = () => {
    let alertText = 
                ('Please take the time to double check the following things regarding your new profile ' + 
                'information. If you are sure everything is correct, press continue.' + 
                "\n")

    for (let i = 0; i < this.state.warnings.length; i++) {
      alertText += "\n" + this.state.warnings[i] + "\n"
    }

    return AlertAsync(
      'Warning',
      alertText,
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {!this.state.scanning ? 
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            Create New Account
          </Text>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Wallet passphrase/WIF key (min. 15 characters):
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quinaryColor}
              onChangeText={(text) => this.setState({wifKey: text})}
              value={this.state.wifKey}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.wifKey}
              inputStyle={styles.wifInput}
              multiline={Platform.OS === 'ios' ? false : true}
            />
            <Button1 
              style={styles.scanSeedButton} 
              buttonContent="SCAN SEED FROM QR" 
              onPress={this.scanSeed}
              />
            <Button1 
              style={styles.generatePassphraseButton} 
              buttonContent="GENERATE RANDOM PASSPHRASE" 
              onPress={this.setKey}
              buttonStyle={{fontSize: 14, color: "#fff",fontFamily: 'Avenir-Black'}}
              />
            <FormLabel labelStyle={styles.passphraseDisplayLabel} containerStyle={{alignSelf: 'center'}}>
            Plaintext Passphrase Display:
            </FormLabel>
            <FormInput 
              value={this.state.wifKey}
              inputStyle={styles.wifInput}
              multiline={true}
              editable={false}
            />
            {this.state.errors.wifKey &&
            <FormValidationMessage>
            {
              this.state.errors.wifKey ? 
                this.state.errors.wifKey
                :
                null
            }
            </FormValidationMessage>}
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>Enter a username:</FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quinaryColor}
              onChangeText={(text) => this.setState({userName: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.userName}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.userName ? 
                this.state.errors.userName
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter an account password (min. 5 characters):
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quinaryColor}
              onChangeText={(text) => this.setState({pin: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.pin}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.pin ? 
                this.state.errors.pin
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Confirm account password:
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quinaryColor}
              onChangeText={(text) => this.setState({confirmPin: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.confirmPin}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.confirmPin ? 
                this.state.errors.confirmPin
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
          <FormLabel labelStyle={styles.formLabel}>
          I have written down my wallet seed/passphrase in a private place:
          </FormLabel>
          <View style={styles.switchContainer}>
            <Switch 
              value={this.state.wifSaved}
              onValueChange={(value) => this.setState({wifSaved: value})}
            />
          </View>
          <FormValidationMessage>
          {
            this.state.errors.wifSaved ? 
              this.state.errors.wifSaved
              :
              null
          }
          </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
          <FormLabel labelStyle={styles.formLabel}>
          I realize anybody with access to my seed/passphrase will have access to my funds:
          </FormLabel>
          <View style={styles.switchContainer}>
            <Switch 
              value={this.state.disclaimerRealized}
              onValueChange={(value) => this.setState({disclaimerRealized: value})}
            />
          </View>
          <FormValidationMessage>
          {
            this.state.errors.disclaimerRealized ? 
              this.state.errors.disclaimerRealized
              :
              null
          }
          </FormValidationMessage>
          </View>
          <View style={this.props.accounts.length > 0 ? styles.buttonContainer : styles.singleButtonContainer}>
          { this.props.accounts.length > 0 && 
            <Button1 
              style={styles.cancelButton} 
              buttonContent="CANCEL" 
              onPress={this.cancel}
            />
          }
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="ADD ACCOUNT" 
              onPress={this._handleSubmit}
            />
          </View>
        </ScrollView>
        :
        <ScanSeed cancel={this.turnOffScan} onScan={this.handleScan}/>
        }
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    updateIntervalID: state.ledger.updateIntervalID
  }
};

export default connect(mapStateToProps)(SignUp);