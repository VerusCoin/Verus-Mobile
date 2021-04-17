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
import BigNumber from "bignumber.js";

export const renderTransactionInfo = function() {
  clearTimeout(this.timeoutTimer);
  const isSendResult = this.state.sendTx
  const validFiatMultiplier =
    this.props.rates[this.state.coinObj.id] != null &&
    this.props.rates[this.state.coinObj.id][this.props.displayCurrency] !=
      null;
  const fiatMultiplier = validFiatMultiplier
    ? BigNumber(
        this.props.rates[this.state.coinObj.id][this.props.displayCurrency]
      )
    : null;
  const validFeeFiatMultiplier =
    this.state.feeCurr == null
      ? validFiatMultiplier
      : this.props.rates[this.state.feeCurr] != null &&
        this.props.rates[this.state.feeCurr][this.props.displayCurrency] !=
          null;
  const feeFiatMultiplier =
    this.state.feeCurr == null
      ? fiatMultiplier
      : validFeeFiatMultiplier
      ? BigNumber(
          this.props.rates[this.state.feeCurr][this.props.displayCurrency]
        )
      : null;

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
        style={{ ...Styles.fullWidth, ...Styles.secondaryBackground, ...Styles.flex }}
        renderItem={({ item }) => {
          if (
            item.data != null &&
            (item.condition == null || item.condition === true)
          )
            return (
              <React.Fragment>
                <TouchableOpacity
                  disabled={item.onPress == null}
                  onPress={() => item.onPress()}
                >
                  <List.Item
                    title={item.data}
                    description={item.key}
                    titleNumberOfLines={item.numLines || 1}
                    right={(props) =>
                      item.right ? (
                        <Text
                          {...props}
                          style={{
                            fontSize: 16,
                            alignSelf: "center",
                            color: Colors.verusDarkGray,
                            fontWeight: "300",
                            marginRight: 8,
                          }}
                        >
                          {item.right}
                        </Text>
                      ) : null
                    }
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
            numLines: 100,
            onPress: () =>
              this.copyAddressToClipboard(this.state.fromAddress),
          },
          {
            key: "Destination",
            data: this.state.toAddress,
            numLines: 100,
            onPress: () => this.copyAddressToClipboard(this.state.toAddress),
          },
          {
            key: "Destination Source",
            data: this.state.identity,
            numLines: 100,
            onPress: () => this.copyVerusIDToClipboard(this.state.identity),
            condition: this.state.identity != null,
          },
          {
            key: "Amount Requested",
            data:
              truncateDecimal(
                this.state.amountSubmitted,
                this.state.coinObj.decimals || 8
              ) +
              " " +
              this.state.coinObj.id,
            right: validFiatMultiplier
              ? `${fiatMultiplier
                  .multipliedBy(this.state.amountSubmitted)
                  .toFixed(2)} ${this.props.displayCurrency}`
              : null,
            condition: this.state.amountSubmitted !== "0",
          },
          {
            key: "Balance",
            data:
              truncateDecimal(
                this.state.balance,
                this.state.coinObj.decimals || 8
              ) +
              " " +
              this.state.coinObj.id,
            right: validFiatMultiplier
              ? `${fiatMultiplier
                  .multipliedBy(this.state.balance)
                  .toFixed(2)} ${this.props.displayCurrency}`
              : null,
            condition: this.state.balance !== 0,
          },
          {
            key: "Fee",
            data:
              this.state.fee +
              " " +
              (this.state.feeCurr
                ? this.state.feeCurr
                : this.state.coinObj.id),
            right: validFeeFiatMultiplier
              ? `${feeFiatMultiplier
                  .multipliedBy(this.state.fee)
                  .toFixed(2)} ${this.props.displayCurrency}`
              : null,
          },
          {
            key: "Amount Deducted",
            data:
              truncateDecimal(
                this.state.finalTxAmount,
                this.state.coinObj.decimals || 8
              ) +
              " " +
              this.state.coinObj.id,
            right: validFiatMultiplier
              ? `${fiatMultiplier
                  .multipliedBy(this.state.finalTxAmount)
                  .toFixed(2)} ${this.props.displayCurrency}`
              : null,
          },
          {
            key: "Remaining Balance",
            data: this.state.remainingBalance + " " + this.state.coinObj.id,
            condition: this.state.remainingBalance !== 0,
            right: validFiatMultiplier
              ? `${fiatMultiplier
                  .multipliedBy(this.state.remainingBalance)
                  .toFixed(2)} ${this.props.displayCurrency}`
              : null,
          },
          {
            key: "Note from Invoice",
            data: this.state.note,
            condition: this.state.note != null && this.state.note.length > 0,
          },
          {
            key: "Message",
            numLines: 100,
            data: this.state.memo,
            condition: this.state.memo != null && this.state.memo.length > 0,
          },
          {
            key: "TxID",
            data: this.state.txid,
            numLines: 100,
            condition: this.state.txid != null,
            onPress: () => this.copyTxIDToClipboard(),
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
            disabled={
              isSendResult && explorers[this.state.coinObj.id] == null
            }
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