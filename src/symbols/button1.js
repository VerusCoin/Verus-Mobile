import React, { Component } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

export default class button1 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      onPressingInProgress: false,
    };
  }
  static containerStyle = {
    height: 44,
    width: 100,
    defaultHeight: "fixed",
    defaultWidth: "auto"
  };

  _onPress = (e) => {
    this.setState({
        onPressingInProgress: true
      }, () => {
           this.props.onPress(e)
           this.setState({
             onPressingInProgress: false
          })
      })
  }


  render() {
    return (
      <TouchableOpacity
      style={this.state.onPressingInProgress ? [styles.root, this.props.style, styles.newOne ] : [styles.root, this.props.style]}
      onPress={this._onPress}
      disabled={this.state.onPressingInProgress}
      >
        <View pointerEvents='none'>
          <Text style={this.props.buttonStyle ? this.props.buttonStyle : styles.buttonContent}>
            {this.props.buttonContent ? this.props.buttonContent : "Button"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
}
const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingRight: 16,
    paddingLeft: 16,
    borderRadius: 5
  },
  buttonContent: {
    fontSize: 16,
    color: "#fff",
    fontFamily: 'Avenir-Black',
  },
  newOne: {
    opacity: 0.7,
  },
});
