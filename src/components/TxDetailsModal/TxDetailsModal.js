/*
  This component displays the details of ta transaction selected
  from the Overview component.
*/

import React, { Component } from "react";
import StandardButton from "../StandardButton";
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  Linking, 
  TouchableOpacity,
  Clipboard,
  Alert,
  FlatList
} from "react-native";
import { unixToDate, MathableNumber } from '../../utils/math';
import { explorers } from '../../utils/CoinData/CoinData';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { ethers } from "ethers";
import { Button, List } from "react-native-paper"
import HalfModal from "../HalfModal";

class TxDetailsModal extends Component {
  constructor(props) {
    super(props);
  }

  openExplorer = () => {
    let url = `${explorers[this.props.activeCoinID]}/tx/${
      this.props.activeCoinID === "BTC"
        ? this.decodeBtcTxid(this.props.txData.txid)
        : this.props.txData.txid
    }`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  };

  copyTxIDToClipboard = () => {
    Clipboard.setString(
      this.props.activeCoinID === "BTC"
        ? this.decodeBtcTxid(this.props.txData.txid)
        : this.props.txData.txid
    );

    Alert.alert("ID Copied", "Transaction ID copied to clipboard");
  };

  copyAddressToClipboard = () => {
    Clipboard.setString(this.props.txData.address);

    Alert.alert("Address Copied", "Transaction Address copied to clipboard");
  };

  //TODO: Move this higher up to txid source
  decodeBtcTxid = () => {
    //Decode decimal txid to hex string
    let txid = this.props.txData.txid;
    let txidArr = txid.split(",");

    try {
      return Buffer.from(txidArr).toString('hex')
    } catch(e) {
      console.error(e)
      Alert.alert("Error", "Error decoding transaction ID.")
      return '-'
    }
  };

  render() {
    const {
      txData,
      animationType,
      visible,
      TxLogo,
      cancel,
      parsedAmount,
      activeCoinID
    } = this.props;

    let amountShown = parsedAmount

    if (txData.fee != null && (txData.feeCurr == null || txData.feeCurr === activeCoinID)) {
      amountShown = new MathableNumber(ethers.utils.formatUnits(
        parsedAmount.num
          .sub(ethers.utils.parseUnits(txData.fee.toString(), parsedAmount.maxDecimals))
      ))
    }
    
    return (
      <HalfModal
        animationType={animationType}
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
      >
        <View style={Styles.centerContainer}>
          <View style={{ ...Styles.headerContainer, maxHeight: "12%" }}>
            <View style={Styles.halfModalHeaderContainer}>
              <Button onPress={cancel} color={Colors.primaryColor}>
                {"Close"}
              </Button>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont,
                }}
              >
                {"Transaction"}
              </Text>
              <Button
                onPress={() => this.openExplorer()}
                color={Colors.primaryColor}
                disabled={!explorers[activeCoinID]}
              >
                {"Details"}
              </Button>
            </View>
          </View>
          <FlatList
            style={Styles.fullWidth}
            renderItem={({item}) => {
              if (
                item.condition == null ||
                item.condition === true
              )
                return (
                  <List.Item title={item.key} style={{ marginRight: 8 }} right={item.data} />
                );
              else return null;
            }}
            data={[
              {
                key: "Type:",
                data: (props) => (
                  <Text
                    style={{
                      ...Styles.capitalizeFirstLetter,
                      ...Styles.listItemTableCell
                    }}
                  >
                    {txData.type || "??"}
                  </Text>
                ),
              },
              {
                key: `Amount ${
                  txData.type === "received" ? "Received" : "Sent"
                }:`,
                data: () => (
                  <Text style={Styles.listItemTableCell}>
                    {amountShown != null
                      ? amountShown.display() + " " + activeCoinID
                      : "??"}
                  </Text>
                ),
              },
              {
                key: "Fee:",
                data: () => (
                  <Text style={Styles.listItemTableCell}>
                    {txData.fee +
                      " " +
                      (txData.feeCurr != null
                        ? txData.feeCurr
                        : activeCoinID)}
                  </Text>
                ),
                condition: txData.fee != null,
              },
              {
                key: "Confirmations",
                data: () => (
                  <Text style={Styles.listItemTableCell}>
                    {txData.confirmations != null
                      ? txData.confirmations
                      : "??"}
                  </Text>
                ),
                condition:
                  explorers[activeCoinID] &&
                  explorers[activeCoinID].includes("etherscan"),
              },
              {
                key: "Address:",
                data: () => (
                  <Text
                    style={{
                      ...(txData.address ? Styles.linkText : {}),
                      ...Styles.listItemTableCell,
                      ...Styles.halfWidthBox
                    }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    onPress={
                      txData.address
                        ? this.copyAddressToClipboard
                        : () => {}
                    }
                  >
                    {txData.address == null
                      ? txData.visibility === "private"
                        ? "hidden"
                        : "??"
                      : txData.address}
                  </Text>
                ),
              },
              {
                key: "Time:",
                data: () => (
                  <Text style={Styles.listItemTableCell}>
                    {txData && txData.timestamp != null
                      ? unixToDate(txData.timestamp)
                      : "??"}
                  </Text>
                ),
              },
              {
                key: "TxID:",
                data: () => (
                  <Text
                    style={{
                      ...(txData.txid != null ? Styles.linkText : {}),
                      ...Styles.listItemTableCell,
                      ...Styles.halfWidthBox
                    }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    onPress={
                      txData.txid != null
                        ? this.copyTxIDToClipboard
                        : () => {}
                    }
                  >
                    {txData.txid != null
                      ? activeCoinID === "BTC"
                        ? this.decodeBtcTxid(txData.txid)
                        : txData.txid
                      : "??"}
                  </Text>
                ),
              },
            ]}
          />
        </View>
      </HalfModal>
    );
  }
}

export default TxDetailsModal;
