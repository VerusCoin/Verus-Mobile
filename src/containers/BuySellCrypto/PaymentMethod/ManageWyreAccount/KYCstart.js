import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  Alert,
} from 'react-native';
import {
  selectWyreAccount,
  selectWyreGetAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  Input,
  Button,
  CheckBox
} from 'react-native-elements';

import Styles from '../../../../styles/index';

import Colors from '../../../../globals/colors';

import { NavigationActions } from '@react-navigation/compat'

class KYCstart extends Component {
constructor(props) {
  super(props)
  this.state = {
    userName: "",
    userEmail: "",
    userPassword: "",
    checked: false
  };
}

  componentDidMount() {

  }

  componentWillUnmount() {

  }

onChangeName = (input) => { this.setState({ userName: input }) }
onChangeEmail = (input) => { this.setState({ userEmail: input }) }
onChangePassword = (input) => { this.setState({ userPassword: input }) }

_checkDetails = () => {
  /*  WHEN ACCESS TO API FIX THIS FUNCTION */

  const chris = true;

  if(chris === true){
    return true;
  }else{
    return false;
  }
}

_checkPassword = () => {
  /* what do we check for? */
}

onCancel = () => {
    console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`)

    this.props.navigation.dispatch(NavigationActions.back());

  }

onSignup = () => {
  console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`)

  if(this._checkDetails() === true){
    this.props.navigation.navigate("KYCInfoScreen", {
      userName: this.state.userName,
      email: this.state.userEmail
    });
  }else{
    Alert.alert("signin failed", "the username and or password is not correct");
  }
}


onFlip = () => { this.state.checked === true ? this.setState({ checked: false }) : this.setState({ checked: true }) }

  render() {
    return (
      <View style={Styles.rootBlue}>
        <View style={Styles.secondaryBackground }>
          <Input
            label="name"
            labelStyle={Styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangeName}
            autoCorrect={false}
          />
          <Input
            label="email"
            labelStyle={Styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangeEmail}
            autoCorrect={false}
          />
          <Input
            label="password"
            labelStyle={Styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangePassword}
            autoCorrect={false}
          />
        </View>
        <View style={Styles.paddingTop}>
          <CheckBox
            title="i agree to the terms and conditions"
            containerStyle={Styles.primaryBackground}
            textStyle={Styles.whiteText}
            checked={ this.state.checked }
            onPress={ this.onFlip }
           />
        </View>
        <View style={ {...Styles.blockWithFlexStart, ...Styles.centralRow }}>
          <View style={Styles.padding}>
            <Button
            title="cancel"
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.defaultButtonClearWhite}
            onPress={ this.onCancel }
            type="outline"
            />
          </View>
          <View style={Styles.padding}>
            <Button
            title="signup"
            buttonStyle={Styles.defaultButtonWhite}
            titleStyle={Styles.seedText}
            onPress={ this.onSignup }
            />
          </View>
        </View>
      </ View>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCstart);
