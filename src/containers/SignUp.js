import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Switch, ScrollView, 
  Keyboard 
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage, Icon } from 'react-native-elements'
import { addUser } from '../actions/actionCreators';
import { connect } from 'react-redux';
import { getKey } from '../utils/keyGenerator/keyGenerator'

class SignUp extends Component {
  constructor() {
    super();
    this.state = {
      wifKey: null,
      pin: null,
      confirmPin: null,
      wifSaved: false,
      userName: null,
      errors: {userName: null, wifKey: null, pin: null, confirmPin: null, wifSaved: null}
    };
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
      errors: {userName: null, wifKey: null, pin: null, confirmPin: null, wifSaved: null}
    }, () => {
      const _userName = this.state.userName
      const _wifKey = this.state.wifKey
      const _pin = this.state.pin
      const _confirmPin = this.state.confirmPin
      const _wifSaved = this.state.wifSaved
      let _errors = false;

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

      if (!_errors) {
        addUser(this.state.userName, this.state.wifKey, this.state.pin, this.props.accounts)
        .then((action) => {
          this.props.dispatch(action);
        })
      } else {
        return false;
      }
    });
  }

  render() {
    return (
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            Create New Account
          </Text>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Wallet passphrase/WIF key (min. 15 characters):
            </FormLabel>
            <FormInput 
              onChangeText={(text) => this.setState({wifKey: text})}
              value={this.state.wifKey}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.wifKey}
              inputStyle={styles.wifInput}
              multiline={true}
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
            <TouchableOpacity onPress={this.setKey}>
              <FormLabel labelStyle={styles.keyGenLabel}>
                Generate random passphrase 
              </FormLabel>
            </TouchableOpacity>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>Enter a username:</FormLabel>
            <FormInput 
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
          I have written down my wallet passphrase (you will not be able to access it past this point):
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
          <View style={this.props.accounts.length > 0 ? styles.buttonContainer : styles.singleButtonContainer}>
          { this.props.accounts.length > 0 && 
            <Button1 
              style={styles.cancelButton} 
              buttonContent="Cancel" 
              onPress={this.cancel}
            />
          }
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="Add Account" 
              onPress={this._handleSubmit}
            />
          </View>
        </ScrollView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
  }
};

export default connect(mapStateToProps)(SignUp);

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
  labelContainer: {
    //borderWidth:1,
    //borderColor:"blue",
  },
  valueContainer: {
    width: "85%",
    //borderWidth:1,
    //borderColor:"blue",
  },
  switchContainer: {
    //borderWidth:1,
    //borderColor:"blue",
    alignItems: "flex-start",
    marginLeft: 18
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
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
  addAccountButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 15,
    marginBottom: 40
  },
  cancelButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
});