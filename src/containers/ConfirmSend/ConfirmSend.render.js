import React, { Component } from "react";
import LottieView from 'lottie-react-native';
import { View, ScrollView, FlatList } from "react-native";
import { Text } from "react-native-paper";
import { List, Button, Divider } from "react-native-paper";
import { truncateDecimal } from '../../utils/math';
import Styles from '../../styles/index'
import Colors from "../../globals/colors";
import { explorers } from "../../utils/CoinData/CoinData";
import AnimatedActivityIndicator from "../../components/AnimatedActivityIndicator";
import { TouchableOpacity } from "react-native-gesture-handler";

export const renderTransactionInfo = function() {
  clearTimeout(this.timeoutTimer);
  const isSendResult = this.state.sendTx

  return (
    <React.Fragment>
      <View style={Styles.headerContainer}>
        <View style={Styles.centerContainer}>
          <Text
            style={{
              ...Styles.mediumCentralPaddedHeader,
              ...Styles.successText,
            }}
          >
            {isSendResult ? "Sent" : "Confirm"}
          </Text>
        </View>
      </View>
      <FlatList
        style={{ ...Styles.fullWidth, ...Styles.secondaryBackground }}
        renderItem={({ item }) => {
          if (item.condition == null || item.condition === true)
            return (
              <React.Fragment>
                <TouchableOpacity
                  disabled={item.onPress == null}
                  onPress={() => item.onPress()}
                >
                  <List.Item
                    title={item.data}
                    description={item.key}
                  />
                  <Divider />
                </TouchableOpacity>
              </React.Fragment>
            );
          else return null;
        }}
        data={[
          {
            key: "From",
            data: this.state.fromAddress,
            onPress: () => this.copyAddressToClipboard(this.state.fromAddress)
          },
          {
            key: "To",
            data: this.state.toAddress,
            onPress: () => this.copyAddressToClipboard(this.state.toAddress)
          },
          {
            key: "Amount Submitted",
            data: (truncateDecimal(
                  this.state.amountSubmitted,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id),
            condition: this.state.amountSubmitted !== "0"
          },
          {
            key: "Balance",
            data: (truncateDecimal(
                  this.state.balance,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id
            ),
            condition: this.state.balance !== 0
          },
          {
            key: "Fee",
            data: (this.state.fee +
                  " " +
                  (this.state.feeCurr
                    ? this.state.feeCurr
                    : this.state.coinObj.id)),
          },
          {
            key: isSendResult ? "Amount Sent" : "Final Amount",
            data: (truncateDecimal(
                  this.state.finalTxAmount,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id),
          },
          {
            key: "Remaining Balance",
            data: (this.state.remainingBalance + " " + this.state.coinObj.id),
            condition: this.state.remainingBalance !== 0
          },
          {
            key: "Message",
            data: (this.state.note),
            condition: this.state.note != null && this.state.note.length > 0,
          },
          {
            key: "TxID",
            data: (this.state.txid),
            condition: this.state.txid != null,
            onPress: () => this.copyTxIDToClipboard()
          },
        ]}
      />
      <View style={Styles.footerContainer}>
        <View style={Styles.standardWidthSpaceBetweenBlock}>
          <Button
            onPress={
              isSendResult
                ? () => {
                    this.navigateToScreen(this.state.coinObj, "Home");
                  }
                : this.cancel
            }
            color={
              isSendResult ? Colors.primaryColor : Colors.warningButtonColor
            }
          >
            {isSendResult ? "Home" : "Back"}
          </Button>
          <Button
            onPress={isSendResult ? this.openExplorer : this.sendTx}
            disabled={isSendResult && explorers[this.state.coinObj.id] == null}
            color={
              isSendResult ? Colors.primaryColor : Colors.successButtonColor
            }
          >
            {isSendResult ? "Details" : "Send"}
          </Button>
        </View>
      </View>
    </React.Fragment>
  );
}

export const renderError = function() {
  clearTimeout(this.timeoutTimer);
  return (
    <React.Fragment>
      <View style={Styles.headerContainer}>
        <View style={Styles.centerContainer}>
          <Text
            style={{
              ...Styles.mediumCentralPaddedHeader,
              ...Styles.errorText,
            }}
          >
            Error
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          ...Styles.centerContainer,
          ...Styles.innerHeaderFooterContainer,
        }}
        style={Styles.secondaryBackground}
      >
        <View style={Styles.wideBlock}>
          <Text style={Styles.centeredText}>{this.state.err}</Text>
        </View>
      </ScrollView>
      <View style={Styles.footerContainer}>
        <View style={Styles.fullWidthFlexCenterBlock}>
          <Button
            onPress={
              this.state.sendTx
                ? () => {
                    this.navigateToScreen(this.state.coinObj, "Home");
                  }
                : this.cancel
            }
            color={
              this.state.sendTx ? Colors.primaryColor : Colors.warningButtonColor
            }
          >
            {this.state.sendTx ? "Home" : "Back"}
          </Button>
        </View>
      </View>
    </React.Fragment>
  );
}

export const renderLoading = function() {
  return (
    <View style={Styles.focalCenter}>
      <AnimatedActivityIndicator
        style={{
          width: 128,
          marginBottom: 64,
        }}
      />
    </View>
  );
}