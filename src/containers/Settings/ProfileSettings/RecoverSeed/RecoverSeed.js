/* 
  This component's purpose is to give the user a screen to enter their
  wallet password, and request their seed to be shown in plaintext. If
  they are properly authorized to do so, they will be notified of the 
  importance of their seed, and that they should realize that it is the 
  sole phrase that controls their funds. If they still choose to proceed,
  their password will be used to decrypt their seed and it will be passed to 
  the displaySeed screen. It is VERY IMPORTANT that the user knows how 
  important their seed is.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  Alert,
  ScrollView, 
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { Input } from 'react-native-elements'
import { checkPinForUser } from '../../../../utils/asyncStore/asyncStore'
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import Styles from '../../../../styles/index'
import Colors from "../../../../globals/colors";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";

class RecoverSeed extends Component {
  constructor() {
    super();
    this.state = {
      password: null,
      errors: {password: null},
    };
  }

  _handleSubmit = () => {
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

  canShowSeed = () => {
    return AlertAsync(
      'Warning',
      "The next screen will display your unencrypted wallet seed in plain text.\n\n" + 
      "Be careful and take into consideration the fact that anyone with access to " + 
      "this seed will have access to all the funds in its wallet.\n\nAre you sure you " +
      "would like to proceed?",
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
    this.setState({
      errors: {password: false}
    }, () => {
      const _password = this.state.password
      let _errors = false;

      if (!_password || _password.length < 1) {
        this.handleError("Required field", "password")
        _errors = true
      } 

      if (!_errors) {
        checkPinForUser(_password, this.props.activeAccount.id)
        .then((seeds) => {
          let promiseArr = [this.canShowSeed(), seeds]
          return Promise.all(promiseArr)
        })
        .then((res) => {
          if (res[0] && Array.isArray(res)) {
            this.setState({password: null}, () => {
              let seeds = res.pop()
              
              this.showSeed(seeds)
            })
          } 
        })
        .catch((e) => {
          console.warn(e)
        })
      } 
    });
  }

  showSeed = (seeds) => {
    this.props.navigation.navigate("DisplaySeed", {
      data: {seeds}
    });
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
          <View style={Styles.wideCenterBlock}>
            <Input 
              label="Enter your account password:"
              labelStyle={Styles.formCenterLabel}
              onChangeText={(text) => this.setState({password: text})}
              value={this.state.password}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.password}
              errorMessage={
                this.state.errors.password ? 
                  this.state.errors.password
                  :
                  null
              }
            />
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <StandardButton 
              buttonColor={Colors.warningButtonColor}
              title="CANCEL" 
              onPress={this.cancel}
            />
            <StandardButton 
              color={Colors.linkButtonColor} 
              title="RECOVER" 
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

export default connect(mapStateToProps)(RecoverSeed);