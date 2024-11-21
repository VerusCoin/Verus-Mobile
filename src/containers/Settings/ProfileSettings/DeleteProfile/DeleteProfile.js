/*
  This component takes in the user's password, and upon authorization,
  creates an action to sign the user out, delete their profile data
  from AsyncStorage, and delete them as a user for all coins in 
  activeCoinsList in memory. It then passes that action to the 
  SecureLoading screen, as this process shouldn't be interrupted in 
  any way.
*/

import React, { Component } from "react";
import { 
  View, 
  ScrollView, 
  Keyboard,
  TextInput as NativeTextInput
} from "react-native";
import { TextInput, Button, Checkbox } from 'react-native-paper'
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { deleteProfile } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import { checkPinForUser } from '../../../../utils/asyncStore/asyncStore'
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles/index'
import { removeBiometricPassword } from "../../../../utils/keychain/keychain";
import { createAlert, resolveAlert } from "../../../../actions/actions/alert/dispatchers/alert";

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
      'Confirm Deletion',
      "Are you sure you would like to delete this profile?",
      [
        {
          text: 'No, take me back',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: false,
      },
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
  
        if (!this.state.confirmSwitch && !_errors) {
          createAlert("Please confirm", "Please confirm you are aware of what deleting your profile entails.")
          _errors = true
        }
  
        if (!_errors) {
          checkPinForUser(_pwd, userID)
          .then(() => {
            return this.canDelete()
          })
          .then((res) => {
            if (res) {
              let data = {
                task: (_account, _biometry) =>
                  this.deleteUser(
                    _account,
                    _biometry
                  ),
                message:
                  "Deleting profile, please do not close Verus Mobile",
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
      if (deleteBiometry) await removeBiometricPassword(account.accountHash)
      
      await deleteProfile(account, this.props.dispatch)
      createAlert("Profile Deleted!", `"${account.id}" profile successfully deleted.`)
    } catch (error) {
      console.warn(error)
      createAlert("Error.", `Failed to delete "${account.id}" profile.`)
    }
  }

  authenticatePwd = () => {
    return (
      <TextInput
        dense
        returnKeyType="done"
        onChangeText={(text) => this.setState({ pwd: text })}
        label="Profile Password"
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
        error={this.state.errors.pwd}
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

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
          <View style={Styles.wideBlock}>
            {this.authenticatePwd()}
          </View>
            <View style={Styles.wideBlock}>
              <Checkbox.Item
                color={Colors.primaryColor}
                label={"I confirm that I would like to delete my profile, and acknowledge that this action cannot be reversed."}
                status={
                  this.state.confirmSwitch
                    ? "checked"
                    : "unchecked"
                }
                onPress={() => this.setState({confirmSwitch: !this.state.confirmSwitch})}
                mode="android"
              />
            </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button
              textColor={Colors.warningButtonColor}
              onPress={this.cancel}
            >{"Cancel"}</Button>
            <Button 
              mode="contained"
              onPress={this._handleSubmit}
            >{"Delete"}</Button>
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

export default connect(mapStateToProps)(DeleteProfile);