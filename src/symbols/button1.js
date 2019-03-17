import React, { Component } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

export default class button1 extends Component {
  
  static containerStyle = {
    height: 44,
    width: 100,
    defaultHeight: "fixed",
    defaultWidth: "auto"
  };
  render() {
    return (
      <TouchableOpacity 
      style={[styles.root, this.props.style]} 
      onPress={this.props.onPress}
      >
        <View pointerEvents='none'>
          <Text style={styles.buttonContent}>
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
    fontSize: 18,
    //fontWeight: "500",
    //fontFamily: "Roboto",
    color: "#fff"
  }
});
