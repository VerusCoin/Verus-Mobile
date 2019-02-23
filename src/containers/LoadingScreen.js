import React, { Component } from "react";
import { View, StyleSheet, Text, FlatList } from "react-native";

export default class LoadingScreen extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,        
    };
    this.arrayholder = [];
  }


  render() {
    return (
      <View></View>
    );
  }
}
const styles = StyleSheet.create({
  
});
