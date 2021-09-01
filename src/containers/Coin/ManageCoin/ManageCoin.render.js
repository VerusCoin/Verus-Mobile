import React, { Component } from "react"
import { 
  View
 } from "react-native"
import { Button } from "react-native-paper"
import Styles from '../../../styles/index'

export const ManageCoinRenderDeposit = function() {
  return (
    <View style={Styles.defaultRoot}>
      <Button>Open deposit modal</Button>
    </View>
  );
};


export const ManageCoinRenderWithdraw = function() {
  return (
    <View style={Styles.defaultRoot}>
      <Button>Open withdrawal modal</Button>
    </View>
  );
};