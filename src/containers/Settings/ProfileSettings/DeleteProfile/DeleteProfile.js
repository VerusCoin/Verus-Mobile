/*
  This component takes in the user's password, and upon authorization,
  creates an action to sign the user out, delete their profile data
  from AsyncStorage, and delete them as a user for all coins in 
  activeCoinsList in memory. It then passes that action to the 
  SecureLoading screen, as this process shouldn't be interrupted in 
  any way.
*/

import {INCORRECT_PASSWORD_MESSAGE} from '../../../../utils/constants/errors';
import React, { Component } from "react";
import {Keyboard, View} from "react-native";
import {Checkbox} from 'react-native-paper'
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { deleteProfile, setBiometry } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import { checkPinForUser } from '../../../../utils/asyncStore/asyncStore'
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { removeBiometricPassword } from "../../../../utils/keychain/biometrics";
import AppTextInput from '../../../../components/AppTextInput';
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';

class DeleteProfile extends Component {
  constructor() {
    super();
    this.state = {
      pwd: null,
      confirmSwitch: false,
      errors: {pwd: null, confirmSwitch: null},
      loading: false,
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

  canDelete = () => {
    return createAlert(
      'Delete this wallet?',
      "The wallet is removed from this device. Only its recovery secrets can restore it.",
      [
        {
          text: 'Not now',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Delete wallet', style: 'destructive', onPress: () => resolveAlert(true)},
      ],
    )
  }

  validateFormData = () => {
    const userID = this.props.activeAccount.id
    const { accountHash, biometry } = this.props.activeAccount
    
    if (userID) {
      this.setState({
        errors: {pwd: null, confirmSwitch: null}
      }, () => {
        const _pwd = this.state.pwd
        const _confirmSwitch = this.state.confirmSwitch
        let _errors = false;
  
        if (!_pwd || _pwd.length < 1) {
          this.handleError("Required field", "pwd")
          _errors = true
        } 
  
        // Delete stays disabled until the backup box is checked.
        if (!_confirmSwitch) {
          _errors = true
        }
  
        if (!_errors) {
          this.setState({loading: true})
          checkPinForUser(_pwd, userID, false)
          .then(() => {
            this.setState({loading: false})
            return this.canDelete()
          }, (error) => {
            this.setState({loading: false})
            this.handleError(
              error?.message === "Incorrect password"
                ? INCORRECT_PASSWORD_MESSAGE
                : "Unable to access this wallet. Try again.",
              "pwd"
            )
            throw error
          })
          .then((res) => {
            if (res) {
              let data = {
                task: (_account, _biometry) =>
                  this.deleteUser(
                    _account,
                    _biometry
                  ),
                message: "Deleting wallet data",
                input: [this.props.activeAccount, biometry],
              };
              this.resetToScreen("SecureLoading", data)
            } 
          })
          .catch((error) => {
            console.warn(error)
          })
        } 
      });
    } else {
      createAlert("Error", "No account ID");
    }
  }

  deleteUser = async (account, deleteBiometry) => {
    try {
      if (deleteBiometry) {
        this.props.dispatch(await setBiometry(account.accountHash, false))
        try {
          await removeBiometricPassword(account.accountHash)
        } catch (error) {
          try {
            this.props.dispatch(await setBiometry(account.accountHash, true))
          } catch (restoreError) {
            console.warn(restoreError)
          }
          throw error
        }
      }

      await deleteProfile(account, this.props.dispatch)
    } catch (error) {
      console.warn(error)
      createAlert(
        "Wallet not deleted",
        `The wallet could not delete "${account.id}" from this device. Sign in and try again.`
      )
      throw error
    }
  }

  authenticatePwd = () => {
    return (
      <AppTextInput
        autoComplete="off"
        errorText={this.state.errors.pwd}
        importantForAutofill="no"
        label="Wallet password"
        onChangeText={pwd =>
          this.setState(({errors}) => ({pwd, errors: {...errors, pwd: null}}))
        }
        returnKeyType="done"
        secureTextEntry
        textContentType="none"
        value={this.state.pwd || ''}
      />
    );
  }

  resetToScreen = (route, data) => {
    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [
        { name: route, params: { data: data } },
      ],
    })

    if (this.props.navigation.closeDrawer) this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  render() {
    return (
      <SettingsScreen
        avoidKeyboard
        footer={
          <SettingsActionFooter
            busy={this.state.loading}
            busyLabel="Preparing wallet deletion…"
            primaryDisabled={!this.state.confirmSwitch}
            primaryLabel="Delete wallet"
            primaryOnPress={this._handleSubmit}
            primaryTestID="settings.deleteProfile.submit"
            primaryVariant="destructive"
            secondaryDisabled={this.state.loading}
            secondaryLabel="Cancel"
            secondaryOnPress={this.cancel}
          />
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        testID="settings.deleteProfile">
        <SettingsNotice
          body="This removes the wallet and its saved biometric credential from this device. Make sure you have its recovery secrets before continuing."
          danger
          icon="alert-octagon-outline"
          title="Irreversible action"
        />
        <SettingsSection title="Authorization">
          <View style={{marginTop: 22}}>
            {this.authenticatePwd()}
          </View>
          <SettingsRow
            accessibilityRole="checkbox"
            accessibilityState={{checked: this.state.confirmSwitch}}
            description="I have backed up the recovery secrets needed to restore this wallet."
            descriptionNumberOfLines={3}
            icon="delete-alert-outline"
            last
            onPress={() => this.setState({confirmSwitch: !this.state.confirmSwitch})}
            showChevron={false}
            title="Confirm recovery backup"
            trailing={
              <View pointerEvents="none">
                <Checkbox
                  status={this.state.confirmSwitch ? 'checked' : 'unchecked'}
                />
              </View>
            }
          />
        </SettingsSection>
      </SettingsScreen>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(DeleteProfile);
