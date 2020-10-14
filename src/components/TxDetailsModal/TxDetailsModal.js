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
  Modal
} from "react-native";
import { unixToDate, MathableNumber } from '../../utils/math';
import { explorers } from '../../utils/CoinData/CoinData';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { ethers } from "ethers";

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
      <Modal
        animationType={animationType}
        transparent={false}
        visible={visible}
        onRequestClose={cancel}
        coverScreen={false}
      >
        <ScrollView
          style={Styles.flexBackground}
          contentContainerStyle={Styles.centerContainer}
        >
          <View style={Styles.tallHeaderContainer}>
            <TxLogo width={50} height={50} />
            <Text style={Styles.centralHeader}>
              {"Transaction Details"}
            </Text>
          </View>
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <View style={Styles.infoTable}>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Type:</Text>
                <Text style={{...Styles.infoTableCell, ...Styles.capitalizeFirstLetter}}>
                  {txData.type || "??"}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>{`Amount ${
                  txData.type === "received" ? "Received" : "Sent"
                }:`}</Text>
                <Text style={Styles.infoTableCell}>
                  {amountShown != null
                    ? amountShown.display() + " " + activeCoinID
                    : "??"}
                </Text>
              </View>
              {txData.fee != null && (
                <View style={Styles.infoTableRow}>
                  <Text style={Styles.infoTableHeaderCell}>Fee:</Text>
                  <Text style={Styles.infoTableCell}>
                    {txData.fee +
                      " " +
                      (txData.feeCurr != null
                        ? txData.feeCurr
                        : activeCoinID)}
                  </Text>
                </View>
              )}
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>
                  Confirmations:
                </Text>
                <Text style={Styles.infoTableCell}>
                  {txData.confirmations != null
                    ? txData.confirmations
                    : "??"}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Address:</Text>
                <Text
                  style={{
                    ...Styles.blockTextAlignRight,
                    ...(txData.address ? Styles.linkText : {}),
                  }}
                  onPress={
                    txData.address ? this.copyAddressToClipboard : () => {}
                  }
                >
                  {txData.address == null
                    ? txData.visibility === "private"
                      ? "hidden"
                      : "??"
                    : txData.address}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Time:</Text>
                <Text style={Styles.infoTableCell}>
                  {txData && txData.timestamp != null
                    ? unixToDate(txData.timestamp)
                    : "??"}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>ID:</Text>
                <Text
                  style={{
                    ...Styles.blockTextAlignRight,
                    ...(txData.txid != null ? Styles.linkText : {}),
                  }}
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
              </View>
            </View>
          </View>
          <View style={Styles.footerContainer}>
            <View
              style={
                explorers[activeCoinID]
                  ? Styles.standardWidthSpaceBetweenBlock
                  : Styles.standardWidthCenterBlock
              }
            >
              <StandardButton
                title={"CLOSE"}
                onPress={cancel}
                color={Colors.warningButtonColor}
              />
              {explorers[activeCoinID] && (
                <StandardButton
                  title="DETAILS"
                  onPress={() => this.openExplorer()}
                  color={Colors.primaryColor}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </Modal>
    );
  }
}

export default TxDetailsModal;
