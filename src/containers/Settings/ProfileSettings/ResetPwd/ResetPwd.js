/*
  This component gives the user the opportunity to reset their 
  wallet password, given they know their old password. Once they
  enter their password, if it is correct, they are asked to confirm, 
  and if they continue, their password is reset in memory by decrypting
  their wallet seed and re-encrypting it with their new password.
*/

import React, { Component } from "react";
import Button1 from "../../../../symbols/button1";
import { 
  View, 
  Text, 
  Alert,
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'
import { resetPwd } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import styles from './ResetPwd.styles'
import Colors from '../../../../globals/colors';

class ResetPwd extends Component {
  constructor() {
    super();
    this.state = {
      oldPwd: null,
      newPwd: null,
      confirmNewPwd: null,
      errors: {oldPwd: null, newPwd: null, confirmNewPwd: null},
      loading: false
    };
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

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  onSuccess = () => {
    Alert.alert("Success!", "Password for " + this.props.activeAccount.id + " reset successfully.");
    this.props.navigation.dispatch(NavigationActions.back())
  }

  canReset = () => {
    return AlertAsync(
      'Confirm Reset',
      "Are you sure you would like to attempt to reset your password?",
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

  validateFormData = () => {
    this.setState({
      errors: {oldPwd: null, newPwd: null, confirmNewPwd: null}
    }, () => {
      const _oldPwd = this.state.oldPwd
      const _newPwd = this.state.newPwd
      const _confirmNewPwd = this.state.confirmNewPwd
      let _errors = false;

      if (!_oldPwd || _oldPwd.length < 1) {
        this.handleError("Required field", "oldPwd")
        _errors = true
      } 

      if (!_newPwd || _newPwd.length < 1) {
        this.handleError("Required field", "newPwd")
        _errors = true
      } else if (_newPwd.length < 5) {
        this.handleError("Min 5 characters", "newPwd")
        _errors = true
      } else if (_newPwd === _oldPwd) {
        this.handleError("Current and new passwords must be different", "newPwd")
        _errors = true
      }

      if (_newPwd !== _confirmNewPwd) {
        this.handleError("Passwords do not match", "confirmNewPwd")
        _errors = true
      }

      if (!_errors) {
        this.canReset()
        .then((res) => {
          if (res) {
            if (this.props.activeAccount) {
              return (resetPwd(this.props.activeAccount.id, this.state.newPwd, this.state.oldPwd))
            } else {
              console.warn("Error, no active account")
              return false
            }
          } else {
            return false
          }
        })
        .then((action) => {
          if (action) {
            this.props.dispatch(action)
            this.onSuccess()
          } else {
            this.setState({ loading: false })
            console.warn("Error, password reset failed")
          }
        })
        .catch((error) => {
          console.warn(error)
        })
      } 
    });
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.root} contentContainerStyle={{height: '100%' ,alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            Reset Password
          </Text>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter your current password:
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quaternaryColor}
              onChangeText={(text) => this.setState({oldPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.oldPwd}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.oldPwd ? 
                this.state.errors.oldPwd
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter a new password (min. 5 characters):
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quaternaryColor}
              onChangeText={(text) => this.setState({newPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.newPwd}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.newPwd ? 
                this.state.errors.newPwd
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Confirm new password:
            </FormLabel>
            <FormInput 
              underlineColorAndroid={Colors.quaternaryColor}
              onChangeText={(text) => this.setState({confirmNewPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.confirmNewPwd}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.confirmNewPwd ? 
                this.state.errors.confirmNewPwd
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.buttonContainer}>
            <Button1 
              style={styles.cancelButton} 
              buttonContent="CANCEL" 
              onPress={this.cancel}
            />
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="RESET" 
              onPress={this._handleSubmit}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ResetPwd);