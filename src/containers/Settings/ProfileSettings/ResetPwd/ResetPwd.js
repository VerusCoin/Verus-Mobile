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
import { resetPwd, setBiometry } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { TextInput, Button } from "react-native-paper";
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors';
import { removeBiometricPassword } from "../../../../utils/keychain/keychain";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";

class ResetPwd extends Component {
  constructor() {
    super();
    this.state = {
      oldPwd: null,
      newPwd: null,
      confirmNewPwd: null,
      errors: {oldPwd: null, newPwd: null, confirmNewPwd: null},
      loading: false,
    };
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({errors: _errors});
  };

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  onSuccess = () => {
    createAlert(
      'Success!',
      'Password for ' + this.props.activeAccount.id + ' reset successfully.',
    );
    this.props.navigation.dispatch(NavigationActions.back());
  };

  canReset = () => {
    return AlertAsync(
      'Confirm Reset',
      'Are you sure you would like to attempt to reset your password?',
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
    );
  };

  validateFormData = () => {
    this.setState(
      {
        errors: {oldPwd: null, newPwd: null, confirmNewPwd: null},
      },
      () => {
        const _oldPwd = this.state.oldPwd;
        const _newPwd = this.state.newPwd;
        const _confirmNewPwd = this.state.confirmNewPwd;
        let _errors = false;

        if (!_oldPwd || _oldPwd.length < 1) {
          this.handleError('Required field', 'oldPwd');
          _errors = true;
        }

        if (!_newPwd || _newPwd.length < 1) {
          this.handleError('Required field', 'newPwd');
          _errors = true;
        } else if (_newPwd.length < 5) {
          this.handleError('Min 5 characters', 'newPwd');
          _errors = true;
        } else if (_newPwd === _oldPwd) {
          this.handleError(
            'Current and new passwords must be different',
            'newPwd',
          );
          createAlert('Error', 'Current and new passwords must be different');
          _errors = true;
        }

        if (_newPwd !== _confirmNewPwd) {
          this.handleError('Passwords do not match', 'confirmNewPwd');
          createAlert('Error', 'Passwords do not match');
          _errors = true;
        }

        if (!_errors) {
          this.canReset()
            .then(async res => {
              if (res) {
                if (this.props.activeAccount) {
                  removeBiometricPassword(this.props.activeAccount.accountHash);
                  await setBiometry(this.props.activeAccount.id, false);
                  return resetPwd(
                    this.props.activeAccount.id,
                    this.state.newPwd,
                    this.state.oldPwd,
                  );
                } else {
                  console.warn('Error, no active account');
                  return false;
                }
              } else {
                return false;
              }
            })
            .then(action => {
              if (action) {
                this.props.dispatch(action);
                this.onSuccess();
              } else {
                this.setState({loading: false});
                console.warn('Error, password reset failed');
              }
            })
            .catch(error => {
              console.warn(error);
            });
        }
      },
    );
  };

  render() {
    return (
      <View
        style={[
          Styles.defaultRoot,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
            ...Styles.fullHeight,
          }}>
          <View style={Styles.wideBlock}>
            <TextInput
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.verusDarkModeForm
                  : Colors.tertiaryColor,
              }}
              returnKeyType="done"
              dense
              onChangeText={text => this.setState({oldPwd: text})}
              label="Current Password"
              theme={{
                colors: {
                  text: this.props.darkMode
                    ? Colors.secondaryColor
                    : 'black',
                  placeholder: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.verusDarkGray,
                },
              }}
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={props => (
                <NativeTextInput
                  autoCapitalize={'none'}
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
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.verusDarkModeForm
                  : Colors.tertiaryColor,
              }}
              onChangeText={text => this.setState({newPwd: text})}
              label="New Password (min. 5 characters)"
              theme={{
                colors: {
                  text: this.props.darkMode
                    ? Colors.secondaryColor
                    : 'black',
                  placeholder: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.verusDarkGray,
                },
              }}
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={props => (
                <NativeTextInput
                  autoCapitalize={'none'}
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
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.verusDarkModeForm
                  : Colors.tertiaryColor,
              }}
              onChangeText={text => this.setState({confirmNewPwd: text})}
              theme={{
                colors: {
                  text: this.props.darkMode
                    ? Colors.secondaryColor
                    : 'black',
                  placeholder: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.verusDarkGray,
                },
              }}
              label="Confirm New Password"
              underlineColor={Colors.primaryColor}
              selectionColor={Colors.primaryColor}
              render={props => (
                <NativeTextInput
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  secureTextEntry={true}
                  {...props}
                />
              )}
              error={this.state.errors.confirmNewPwd}
            />
          </View>
        </ScrollView>
        <View
          style={[
            Styles.highFooterContainer,
            {
              backgroundColor: this.props.darkMode
                ? Colors.verusDarkModeForm
                : Colors.secondaryColor,
            },
          ]}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button color={Colors.warningButtonColor} onPress={this.cancel}>
              {'Cancel'}
            </Button>
            <Button color={Colors.primaryColor} onPress={this._handleSubmit}>
              {'Reset'}
            </Button>
          </View>
        </View>
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    activeAccount: state.authentication.activeAccount,
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(ResetPwd);