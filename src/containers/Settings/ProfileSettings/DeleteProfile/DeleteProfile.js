/*
  This component takes in the user's password, and upon authorization,
  creates an action to sign the user out, delete their profile data
  from AsyncStorage, and delete them as a user for all coins in 
  activeCoinsList in memory. It then passes that action to the 
  SecureLoading screen, as this process shouldn't be interrupted in 
  any way.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  Alert,
  ScrollView, 
  Keyboard,
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { Input, CheckBox } from 'react-native-elements'
import { deleteUserByID } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { checkPinForUser } from '../../../../utils/asyncStore/asyncStore'
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles/index'

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

  onSuccess = () => {
    Alert.alert("Success!", "Password for " + this.props.activeAccount.id + " reset successfully.");
    this.props.navigation.dispatch(NavigationActions.back())
  }

  canDelete = () => {
    return AlertAsync(
      'Confirm Deletion',
      "Are you sure you would like to delete this profile?",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  validateFormData = () => {
    const userID = (this.props.route.params && this.props.route.params.data) ? 
      this.props.route.params.data.coinObj
      :
      this.props.activeAccount.id
    
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
          Alert.alert("Please confirm", "Please confirm you are aware of what deleting your profile entails.")
          _errors = true
        }
  
        if (!_errors) {
          checkPinForUser(_pwd, userID)
          .then((res) => {
            if (res) {
              return this.canDelete()
            } else {
              return false
            }
          })
          .then((res) => {
            if (res) {
              let data = {
                task: this.deleteUser,
                message: "Deleting profile, please do not close Verus Mobile",
                input: [userID],
                dispatchResult: true
              }
              this.resetToScreen("SecureLoading", data)
            } 
          })
          .catch((error) => {
            console.warn(error)
          })
        } 
      });
    } else {
      Alert.alert("Error", "No account ID");
    }
  }

  deleteUser = async (userId) => {
    try {
      const res = await deleteUserByID(userId)
      Alert.alert("Account Deleted!", `"${userId}" account successfully deleted.`)

      return res
    } catch (error) {
      console.error(error)
      Alert.alert("Error.", `Failed to delete "${userId}" account.`)
    }
  }

  authenticatePwd = () => {
    return (
      <Input 
        label="Enter your password:"
        labelStyle={Styles.formCenterLabel}
        containerStyle={Styles.wideCenterBlock}
        inputStyle={Styles.inputTextDefaultStyle}
        onChangeText={(text) => this.setState({pwd: text})}
        autoCapitalize={"none"}
        autoCorrect={false}
        secureTextEntry={true}
        shake={this.state.errors.pwd}
        errorMessage={
          this.state.errors.pwd ? 
            this.state.errors.pwd
            :
            null
        }
      />
    )
  }

  resetToScreen = (route, data) => {
    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [
        { name: route, params: { data: data } },
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
          {this.authenticatePwd()}
          <View style={Styles.wideBlock}>
            <CheckBox
              title="I confirm that I would like to delete my profile, and acknowledge that 
              this action cannot be reversed."
              checked={this.state.confirmSwitch}
              textStyle={Styles.defaultText}
              onPress={() => this.setState({confirmSwitch: !this.state.confirmSwitch})}
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
              color={Colors.linkButtonColor}
              title="DELETE" 
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

export default connect(mapStateToProps)(DeleteProfile);