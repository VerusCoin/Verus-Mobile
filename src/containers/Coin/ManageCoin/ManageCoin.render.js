import React, { Component } from "react"
import { 
  View
 } from "react-native"
import { Button } from "react-native-paper"
import { openWithdrawSendModal } from "../../../actions/actions/sendModal/dispatchers/sendModal";
import Styles from '../../../styles/index'

export const ManageCoinRenderDeposit = function() {
  return (
    <View style={Styles.defaultRoot}>
      <Button onPress={() => {}}>
        Open deposit modal
      </Button>
    </View>
  );
};