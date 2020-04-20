/*
  This component gives the user the opportunity to reset their 
  wallet password, given they know their old password. Once they
  enter their password, if it is correct, they are asked to confirm, 
  and if they continue, their password is reset in memory by decrypting
  their wallet seed and re-encrypting it with their new password.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  Text, 
  Alert,
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, Input, FormValidationMessage } from 'react-native-elements'
import { resetPwd } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import Styles from '../../../../styles/index'
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
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
          <View style={Styles.wideBlock}>
            <Input 
              label="Enter your current password:"
              labelStyle={Styles.formCenterLabel}
              containerStyle={Styles.wideCenterBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({oldPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.pwd}
              errorMessage={
                this.state.errors.oldPwd ? 
                  this.state.errors.oldPwd
                  :
                  null
              }
              />
          </View>
          <View style={Styles.wideBlock}>
            <Input 
              label="Enter a new password (min. 5 characters):"
              labelStyle={Styles.formCenterLabel}
              containerStyle={Styles.wideCenterBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({newPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.pwd}
              errorMessage={
                this.state.errors.newPwd ? 
                  this.state.errors.newPwd
                  :
                  null
              }
            />
          </View>
          <View style={Styles.wideBlock}>
            <Input 
              label="Confirm new password:"
              labelStyle={Styles.formCenterLabel}
              containerStyle={Styles.wideCenterBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({confirmNewPwd: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.pwd}
              errorMessage={
                this.state.errors.confirmNewPwd ? 
                  this.state.errors.confirmNewPwd
                  :
                  null
              }
            />
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <StandardButton 
              color={Colors.warningButtonColor}
              title="CANCEL" 
              onPress={this.cancel}
            />
            <StandardButton 
              style={Colors.infoButtonColor} 
              title="RESET" 
              onPress={this._handleSubmit}
            />
          </View>
        </View>
      </View>
      
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ResetPwd);