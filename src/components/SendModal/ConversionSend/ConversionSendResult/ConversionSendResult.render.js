import React from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Button, List, Divider, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import { explorers } from "../../../../utils/CoinData/CoinData";
import AnimatedSuccessCheckmark from "../../../AnimatedSuccessCheckmark";

export const ConversionSendResultRender = function () {
  return ConversionSendSuccessRender.call(this)
};

export const ConversionSendSuccessRender = function () {
  const { txid, toAddress, finalTxAmount } = this.state.params;
  const coinObj = this.state.params.coinObj == null ? {} : this.state.params.coinObj;

  return (
    <ScrollView
      style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}
      contentContainerStyle={{ ...Styles.focalCenter, justifyContent: "space-between" }}
    >
      <Text>{"done"}</Text>
    </ScrollView>
  );
};