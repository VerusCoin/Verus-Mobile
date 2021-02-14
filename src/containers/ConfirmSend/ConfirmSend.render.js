import React, { Component } from "react";
import StandardButton from "../../components/StandardButton";
import { View, Text, ScrollView, FlatList } from "react-native";
import { List, Button } from "react-native-paper";
import { truncateDecimal } from '../../utils/math';
import ProgressBar from 'react-native-progress/Bar';
import Styles from '../../styles/index'
import Colors from "../../globals/colors";
import { explorers } from "../../utils/CoinData/CoinData";

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
              <List.Item
                title={item.key}
                style={{ marginRight: 8 }}
                right={item.data}
              />
            );
          else return null;
        }}
        data={[
          {
            key: "From:",
            data: (props) => (
              <Text
                style={[Styles.listItemTableCell, Styles.halfWidthBox]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {this.state.fromAddress}
              </Text>
            ),
          },
          {
            key: "To:",
            data: (props) => (
              <Text
                style={[Styles.listItemTableCell, Styles.halfWidthBox]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {this.state.toAddress}
              </Text>
            ),
          },
          {
            key: "Amount Submitted:",
            data: () => (
              <Text style={Styles.listItemTableCell}>
                {truncateDecimal(
                  this.state.amountSubmitted,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id}
              </Text>
            ),
            condition: this.state.amountSubmitted !== "0"
          },
          {
            key: "Balance:",
            data: () => (
              <Text style={Styles.listItemTableCell}>
                {truncateDecimal(
                  this.state.balance,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id}
              </Text>
            ),
            condition: this.state.balance !== 0
          },
          {
            key: "Fee:",
            data: () => (
              <Text style={Styles.listItemTableCell}>
                {this.state.fee +
                  " " +
                  (this.state.feeCurr
                    ? this.state.feeCurr
                    : this.state.coinObj.id)}
              </Text>
            ),
          },
          {
            key: isSendResult ? "Amount Sent" : "Final Amount:",
            data: () => (
              <Text
                style={
                  this.state.feeTakenFromAmount
                    ? { ...Styles.listItemTableCell, ...Styles.warningText }
                    : Styles.listItemTableCell
                }
              >
                {truncateDecimal(
                  this.state.finalTxAmount,
                  this.state.coinObj.decimals || 8
                ) +
                  " " +
                  this.state.coinObj.id}
              </Text>
            ),
          },
          {
            key: "Remaining Balance:",
            data: () => (
              <Text style={Styles.listItemTableCell}>
                {this.state.remainingBalance + " " + this.state.coinObj.id}
              </Text>
            ),
            condition: this.state.remainingBalance !== 0
          },
          {
            key: "Message:",
            data: () => (
              <Text style={Styles.listItemTableCell}>{this.state.note}</Text>
            ),
            condition: this.state.note != null && this.state.note.length > 0,
          },
          {
            key: "TxID:",
            data: () => (
              <Text
                style={{
                  ...Styles.linkText,
                  ...Styles.listItemTableCell,
                  ...Styles.halfWidthBox,
                }}
                numberOfLines={1}
                ellipsizeMode="middle"
                onPress={this.copyTxIDToClipboard}
              >
                {this.state.txid}
              </Text>
            ),
            condition: this.state.txid != null,
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
  return(
    <View style={Styles.focalCenter}>
      <ProgressBar progress={this.state.loadingProgress} width={200} color={Colors.linkButtonColor}/>
      <Text style={Styles.mediumCentralPaddedHeader}>{this.state.loadingMessage}</Text>
    </View>
  )
}