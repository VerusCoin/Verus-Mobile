import React, { Component } from "react";
import { Button, Input, Icon } from "react-native-elements";
import Styles from "../styles/index";
import { View } from "react-native";
import Colors from '../globals/colors';

export default class PasswordInput extends Component {
  render() {
    return (
      <View style={Styles.standardWidthFlexRowBlock}>
        <Icon name="lock" color={Colors.linkButtonColor} size={36} />
        <Input
          onChangeText={this.props.onChangeText}
          autoCapitalize={"none"}
          autoCorrect={false}
          autoComplete="off"
          secureTextEntry={true}
          containerStyle={Styles.passwordInputContainer}
          errorMessage={this.props.errorMessage}
          clearTextOnFocus
          ref={this.props.reference}
          value={this.props.value}
        />
      </View>
    );
  }
}
