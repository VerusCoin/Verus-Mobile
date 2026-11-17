/*
  This component gives the user the opportunity to reset their 
  wallet password, given they know their old password. Once they
  enter their password, if it is correct, they are asked to confirm, 
  and if they continue, their password is reset in memory by decrypting
  their wallet seed and re-encrypting it with their new password.
*/

import {INCORRECT_PASSWORD_MESSAGE} from '../../../../utils/constants/errors';
import React, { Component } from "react";
import {Keyboard} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { resetPwd, signOut } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { checkPinForUser } from "../../../../utils/asyncStore/asyncStore";
import {resetToScreen} from "../../../../utils/navigation/resetToScreen";
import { removeBiometricPassword } from "../../../../utils/keychain/biometrics";
import AppTextInput from '../../../../components/AppTextInput';
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';

const passwordAutofillProps = {
  autoComplete: "off",
  importantForAutofill: "no",
  textContentType: "none",
};

export class ResetPwd extends Component {
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
    createAlert("Password changed", "Sign in with the new password.");
    this.handleLogout();
  }

  onFailure = () => {
    createAlert(
      "Password not changed",
      "The wallet could not change the password. Try again.",
    );
  }

  canReset = () => {
    return createAlert(
      'Change password?',
      "The wallet signs out.",
      [
        {
          text: 'Not now',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Change and sign out', onPress: () => resolveAlert(true)},
      ],
    )
  }

  // The password reset returns false for any failure, a wrong current
  // password included. Check that password here so a wrong one shows on its
  // field; anything else gets the failure sheet.
  reportFailure = async (oldPwd) => {
    try {
      await checkPinForUser(oldPwd, this.props.activeAccount?.id, false)
    } catch (error) {
      if (error?.message === "Incorrect password") {
        this.handleError(INCORRECT_PASSWORD_MESSAGE, "oldPwd")
        return
      }

      console.warn(error)
    }

    this.onFailure()
  }

  clearFieldError = (field) => (value) => {
    this.setState(({errors}) => ({
      [field]: value,
      errors: {...errors, [field]: null},
    }))
  }

  resetToScreen = (route, title, data, fullReset) => {
    resetToScreen(this.props.navigation, route, title, data, fullReset);
  }

  handleLogout = () => {
    const sessionScope = {
      sessionScoped: true,
      accountHash: this.props.activeAccount?.accountHash || null,
      sessionEpoch: this.props.sessionEpoch,
    };
    this.resetToScreen("SecureLoading", null, {
      task: () => {
        // Hack to prevent crash on screens that require activeAccount not to be null
        // TODO: Find a more elegant solution
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            this.props.dispatch(signOut(sessionScope))
            resolve()
          }, 1000)
        })
      },
      message: "Signing out",
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
      } else if (_newPwd === _oldPwd) {
        this.handleError("Current and new passwords must be different", "newPwd")
        _errors = true
      }

      if (_newPwd !== _confirmNewPwd) {
        this.handleError("Passwords do not match", "confirmNewPwd")
        _errors = true
      }

      if (!_errors) {
        let confirmed = false
        let changed = false

        this.canReset()
        .then(async (res) => {
          if (res) {
            confirmed = true
            this.setState({ loading: true })

            if (this.props.activeAccount) {
              return (resetPwd(this.props.activeAccount.accountHash, this.state.newPwd, this.state.oldPwd))
            } else {
              console.warn("Error, no active account")
              return false
            }
          } else {
            return false
          }
        })
        .then(async (action) => {
          if (action) {
            changed = true
            const biometricAccountHash = this.props.activeAccount.biometry
              ? this.props.activeAccount.accountHash
              : null
            this.props.dispatch(action)

            // Biometric login was disabled in the same durable transaction as
            // the password change. Removing its stale Keychain entry is now
            // best-effort and cannot make the reset appear to have failed.
            if (biometricAccountHash != null) {
              try {
                await removeBiometricPassword(biometricAccountHash)
              } catch (e) {
                console.warn("Failed to remove biometrics")
                console.warn(e)
              }
            }

            this.onSuccess()
          } else {
            if (confirmed) {
              console.warn("Error, password reset failed")
              await this.reportFailure(_oldPwd)
            }

            this.setState({ loading: false })
          }
        })
        .catch(async (error) => {
          console.warn(error)
          if (confirmed && !changed) await this.reportFailure(_oldPwd)
          this.setState({ loading: false })
        })
      } 
    });
  }

  render() {
    return (
      <SettingsScreen
        avoidKeyboard
        footer={
          <SettingsActionFooter
            busy={this.state.loading}
            busyLabel="Preparing password reset…"
            primaryLabel="Reset password"
            primaryOnPress={this._handleSubmit}
            primaryTestID="settings.changePassword.submit"
            secondaryDisabled={this.state.loading}
            secondaryLabel="Cancel"
            secondaryOnPress={this.cancel}
          />
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        testID="settings.changePassword">
        <SettingsSection title="Password">
          <AppTextInput
            {...passwordAutofillProps}
            errorText={this.state.errors.oldPwd}
            label="Current password"
            onChangeText={this.clearFieldError("oldPwd")}
            returnKeyType="next"
            secureTextEntry
            value={this.state.oldPwd || ''}
          />
          <AppTextInput
            {...passwordAutofillProps}
            containerStyle={{marginTop: 16}}
            errorText={this.state.errors.newPwd}
            label="New password"
            onChangeText={this.clearFieldError("newPwd")}
            returnKeyType="next"
            secureTextEntry
            value={this.state.newPwd || ''}
          />
          <AppTextInput
            {...passwordAutofillProps}
            containerStyle={{marginTop: 16}}
            errorText={this.state.errors.confirmNewPwd}
            label="Confirm new password"
            onChangeText={this.clearFieldError("confirmNewPwd")}
            returnKeyType="done"
            secureTextEntry
            value={this.state.confirmNewPwd || ''}
          />
        </SettingsSection>
        <SettingsNotice
          body="Changing this password re-encrypts the wallet, removes its saved biometric credential, and signs you out."
          icon="shield-key-outline"
          title="Security step"
        />
      </SettingsScreen>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    sessionEpoch: state.authentication.sessionEpoch,
  }
};

export default connect(mapStateToProps)(ResetPwd);
