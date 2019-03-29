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
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  Alert,
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'
import { checkPinForUser } from '../utils/asyncStore'
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";

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

  onSuccess = () => {
    Alert.alert("Success!", "Password for " + this.props.activeAccount.id + " reset successfully.");
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
        .then((seed) => {
          if (seed) {
            let promiseArr = [this.canShowSeed(), seed]
            return Promise.all(promiseArr)
          } else {
            return false
          }
        })
        .then((res) => {
          if (res[0] && Array.isArray(res)) {
            this.setState({password: null}, () => {
              let seed = res.pop()
              this.showSeed(seed)
            })
          } 
        })
        .catch((e) => {
          console.warn(e)
        })
      } 
    });
  }

  showSeed = (seed) => {
    this.props.navigation.navigate("DisplaySeed", {
      data: {seed: seed}
    });
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            Recover Wallet Seed
          </Text>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter your account password:
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({password: text})}
              value={this.state.password}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.password}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.password ? 
                this.state.errors.password
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.buttonContainer}>
            <Button1 
              style={styles.cancelButton} 
              buttonContent="Cancel" 
              onPress={this.cancel}
            />
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="Recover" 
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

export default connect(mapStateToProps)(RecoverSeed);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
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
  buttonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
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