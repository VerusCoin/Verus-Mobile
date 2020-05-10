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
import { unixToDate } from '../../utils/math';
import { explorers } from '../../utils/CoinData/CoinData';
import { truncateDecimal } from '../../utils/math';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';

class TxDetailsModal extends Component {
  constructor(props) {
    super(props);
  }

  openExplorer = () => {
    let url = `${explorers[this.props.activeCoinID]}/tx/${
      this.props.txData.txid
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

    for (let i = 0; i < txidArr.length; i++) {
      txidArr[i] = Number(txidArr[i]).toString(16);
      if (!isNaN(Number(txidArr[i])) && txidArr[i].length === 1) {
        txidArr[i] = "0" + txidArr[i];
      }
    }

    return txidArr.join("");
  };

  render() {
    const {
      txData,
      animationType,
      visible,
      txLogo,
      cancel,
      parsedAmount,
      activeCoinID
    } = this.props;

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
            <Image style={{ width: 50, height: 50 }} source={txLogo} />
            <Text style={Styles.centralHeader}>{"Transaction Details"}</Text>
          </View>
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <View style={Styles.infoTable}>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Type:</Text>
                <Text style={Styles.infoTableCell}>{txData.type || "??"}</Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Category:</Text>
                <Text style={Styles.infoTableCell}>{txData.visibility || "??"}</Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Amount:</Text>
                <Text style={Styles.infoTableCell}>
                  {parsedAmount != null
                    ? truncateDecimal(parsedAmount, 8) + " " + activeCoinID
                    : "??"}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Confirmations:</Text>
                <Text style={Styles.infoTableCell}>
                  {txData.confirmations != null ? txData.confirmations : "??"}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Address:</Text>
                <Text
                  style={{
                    ...Styles.blockTextAlignRight,
                    ...(txData.address ? Styles.linkText : {})
                  }}
                  onPress={txData.address ? this.copyAddressToClipboard : () => {}}
                >
                  {txData.address == null ? (txData.visibility === "private" ? "hidden" : "??") : txData.address}
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
                    ...(txData.txid != null ? Styles.linkText : {})
                  }}
                  onPress={txData.txid != null ? this.copyTxIDToClipboard : () => {}}
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
