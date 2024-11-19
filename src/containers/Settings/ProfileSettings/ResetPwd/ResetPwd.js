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
  Alert,
  ScrollView, 
  Keyboard,
  TextInput as NativeTextInput
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { resetPwd, setBiometry, signOut } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { TextInput, Button } from "react-native-paper";
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors';
import { removeBiometricPassword } from "../../../../utils/keychain/keychain";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import scorePassword from "../../../../utils/auth/scorePassword";
import { MIN_PASS_LENGTH, MIN_PASS_SCORE, PASS_SCORE_LIMIT } from "../../../../utils/constants/constants";
import { CommonActions } from "@react-navigation/native";
import { clearActiveAccountLifecycles } from "../../../../actions/actionDispatchers";

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
    createAlert("Success!", "Password for " + this.props.activeAccount.id + " reset successfully.");
    this.handleLogout();
  }

  canReset = () => {
    return AlertAsync(
      'Confirm Reset',
      "Are you sure you would like to reset your password? This will log you out.",
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

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [
          { name: route, params: { data: data } },
        ],
      })
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      })
    }

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  handleLogout = () => {
    this.resetToScreen("SecureLoading", null, {
      task: () => {
        // Hack to prevent crash on screens that require activeAccount not to be null
        // TODO: Find a more elegant solution
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            await clearActiveAccountLifecycles()
            this.props.dispatch(signOut())
            resolve()
          }, 1000)
        })
      },
      message: "Signing out...",
      route: "Home",
      successMsg: "Reset password",
      errorMsg: "Failed to sign out"
    }, true)
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
        createAlert("Error", "Current and new passwords must be different")
        _errors = true
      } else {
        const passScore = scorePassword(_newPwd, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);

        if (passScore < MIN_PASS_SCORE) {
          this.handleError("Please choose a stronger password", "newPwd")
          createAlert("Error", "Please choose a stronger password")
          _errors = true
        }
      }

      if (_newPwd !== _confirmNewPwd) {
        this.handleError("Passwords do not match", "confirmNewPwd")
        createAlert("Error", "Passwords do not match")
        _errors = true
      }

      if (!_errors) {
        this.canReset()
        .then(async (res) => {
          if (res) {
            if (this.props.activeAccount) {
              if (this.props.activeAccount.biometry) {
                await removeBiometricPassword(this.props.activeAccount.accountHash)
              }
              
              await setBiometry(this.props.activeAccount.accountHash, false)
              return (resetPwd(this.props.activeAccount.accountHash, this.state.newPwd, this.state.oldPwd))
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
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
            ...Styles.fullHeight,
          }}
        >
          <View style={Styles.wideBlock}>
            <TextInput
              returnKeyType="done"
              dense
              onChangeText={(text) => this.setState({ oldPwd: text })}
              label="Current password"
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={(props) => (
                <NativeTextInput
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  secureTextEntry={true}
                  {...props}
                />
              )}
              error={this.state.errors.oldPwd}
            />
          </View>
          <View style={Styles.wideBlock}>
            <TextInput
              returnKeyType="done"
              dense
              onChangeText={(text) => this.setState({ newPwd: text })}
              label="New password (min. 5 characters)"
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={(props) => (
                <NativeTextInput
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  secureTextEntry={true}
                  {...props}
                />
              )}
              error={this.state.errors.newPwd}
            />
          </View>
          <View style={Styles.wideBlock}>
            <TextInput
              returnKeyType="done"
              dense
              onChangeText={(text) =>
                this.setState({ confirmNewPwd: text })
              }
              label="Confirm new password"
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={(props) => (
                <NativeTextInput
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  secureTextEntry={true}
                  {...props}
                />
              )}
              error={this.state.errors.confirmNewPwd}
            />
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button 
              textColor={Colors.warningButtonColor} 
              onPress={this.cancel}
            >
              {"Cancel"}
            </Button>
            <Button
              mode="contained"
              onPress={this._handleSubmit}
            >
              {"Reset"}
            </Button>
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