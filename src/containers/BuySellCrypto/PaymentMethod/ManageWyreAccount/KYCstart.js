import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
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

import styles from '../../../../styles/index';

import Colors from '../../../../globals/colors';


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
onCancel = () => { console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`) }
onSignup = () => { console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`) }
onFlip = () => { this.state.checked === true ? this.setState({ checked: false }) : this.setState({ checked: true }) }

  render() {
    return (
      <View style={styles.rootBlue}>
        <View style={styles.secondaryBackground }>
          <Input
            label="name"
            labelStyle={styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangeName}
            autoCorrect={false}
          />
          <Input
            label="email"
            labelStyle={styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangeEmail}
            autoCorrect={false}
          />
          <Input
            label="password"
            labelStyle={styles.formLabel}
            containerStyle={Styles.wideCenterBlock}
            inputStyle={Styles.inputTextDefaultStyle}
            onChangeText={this.onChangePassword}
            autoCorrect={false}
          />
        </View>
        <View style={styles.paddingTop}>
          <CheckBox
            title="i agree to the terms and conditions"
            containerStyle={Styles.primaryBackground}
            textStyle={Styles.whiteText}
            checked={ this.state.checked }
            onPress={ this.onFlip }
           />
        </View>
        <View style={Styles.padding}>
          <View>
            <Button
            title="cancel"
            onPress={ this.onCancel }
            />
          </View>
          <View>
            <Button
            title="signup"
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
