/*
  This screen is shown briefly before the login or sign 
  up screen is shown, as the app is loading coin data from 
  asyncStorage. It will be shown a little longer the more coins
  are added to the wallet, and should feature some animation 
  or interesting splash image that goes well with the static 
  splash image at the beginning.
*/

import React, { Component } from "react";
import { View, StyleSheet } from "react-native";

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
