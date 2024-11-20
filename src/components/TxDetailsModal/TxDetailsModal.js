/*
  This component displays the details of ta transaction selected
  from the Overview component.
*/

import React, { Component } from "react";
import StandardButton from "../StandardButton";
import { 
  View, 
  Linking, 
  Clipboard,
  Alert,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from "react-native";
import { unixToDate, truncateDecimal } from '../../utils/math';
import { explorers } from '../../utils/CoinData/CoinData';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { Button, List, Text, Divider } from "react-native-paper"
import SemiModal from "../SemiModal";
import { WALLET_APP_MANAGE } from "../../utils/constants/apps";
import { expireCoinData } from "../../actions/actionCreators";
import { API_GET_DEPOSIT_SOURCES, API_GET_PENDING_DEPOSITS } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import store from "../../store";
import { openUrl } from "../../utils/linking";

class TxDetailsModal extends Component {
  constructor(props) {
    super(props);
  }

  openExplorer = () => {
    let url = `${explorers[this.props.activeCoinExplorerId]}/tx/${
      this.props.txData.txid != null
        ? this.decodeTxid(this.props.txData.txid)
        : this.props.txData.txid
    }`;

    openUrl(url)
  };

  copyTxIDToClipboard = () => {
    const txid = this.props.txData.txid != null
    ? this.decodeTxid(this.props.txData.txid)
    : this.props.txData.txid

    Clipboard.setString(txid);

    Alert.alert("TxID Copied", txid);
  };

  copyBlockchainTxIDToClipboard = () => {
    const txid = this.props.txData.blockchainTxId != null
    ? this.decodeTxid(this.props.txData.blockchainTxId)
    : this.props.txData.blockchainTxId

    Clipboard.setString(txid);

    Alert.alert("TxID Copied", txid);
  }

  copyAddressToClipboard = () => {
    Clipboard.setString(this.props.txData.address);

    Alert.alert("Address Copied", this.props.txData.address);
  };

  copyMemoToClipboard = () => {
    Clipboard.setString(this.props.txData.memo);

    Alert.alert("Message Copied", this.props.txData.memo);
  };

  goToManageTab = () => {
    store.dispatch(expireCoinData(this.props.activeCoinID, API_GET_DEPOSIT_SOURCES));
    store.dispatch(expireCoinData(this.props.activeCoinID, API_GET_PENDING_DEPOSITS));
    conditionallyUpdateWallet(
      store.getState(),
      store.dispatch,
      this.props.activeCoinID,
      API_GET_DEPOSIT_SOURCES
    );
    conditionallyUpdateWallet(
      store.getState(),
      store.dispatch,
      this.props.activeCoinID,
      API_GET_PENDING_DEPOSITS
    );

    this.props.jumpTo(WALLET_APP_MANAGE)
    this.props.cancel()
  }

  //TODO: Move this higher up to txid source
  decodeTxid = () => {
    //Decode decimal txid to hex string
    let txid = this.props.txData.txid;
    let txidArr = txid.split(",");

    try {
      if (txidArr.length > 1) {
        return Buffer.from(txidArr).toString('hex')
      } else return txid
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
      cancel,
      displayAmount,
      activeCoinDisplayTicker,
      activeCoinExplorerId
    } = this.props;
    
    return (
      <SemiModal
        animationType={animationType}
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
        flexHeight={4}
      >
        <SafeAreaView style={Styles.centerContainer}>
          <View style={{ ...Styles.headerContainer, minHeight: 48 }}>
            <View style={Styles.semiModalHeaderContainer}>
              <Button onPress={cancel} textColor={Colors.primaryColor}>
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
                textColor={Colors.primaryColor}
                disabled={!explorers[activeCoinExplorerId]}
              >
                {"Details"}
              </Button>
            </View>
          </View>
          <FlatList
            style={Styles.fullWidth}
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
                        titleNumberOfLines={item.numLines || 1}
                        titleStyle={item.capitalized ? Styles.capitalizeFirstLetter : undefined}
                        right={(props) =>
                          item.right ? (
                            <Text
                              {...props}
                              style={{
                                fontSize: 16,
                                alignSelf: "center",
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
                key: "Type",
                data:
                  (txData.type === "sent"
                    ? "Outgoing"
                    : txData.type === "received"
                    ? "Incoming"
                    : txData.type) || "Unknown",
                capitalized: true,
              },
              {
                key: "Amount",
                data: `${
                  displayAmount != null ? truncateDecimal(displayAmount, this.props.decimals) : "??"
                } ${
                  txData.feeCurr != null && txData.type === "self" ? txData.feeCurr : activeCoinDisplayTicker
                }`,
                numLines: 100,
              },
              {
                key: "Fee",
                data: txData.fee + " " + (txData.feeCurr != null ? txData.feeCurr : activeCoinDisplayTicker),
                condition: txData.fee != null,
                numLines: 100,
              },
              {
                key: "Status",
                data:
                  txData.confirmed != null
                    ? txData.confirmed
                      ? "Confirmed"
                      : "Pending"
                    : "Unknown",
              },
              {
                key: "Address",
                onPress: txData.address ? this.copyAddressToClipboard : () => {},
                data:
                  txData.address == null
                    ? txData.visibility === "private"
                      ? "hidden"
                      : "Unknown"
                    : txData.address,
                numLines: 100,
              },
              {
                key: "Time",
                data: txData && txData.timestamp != null ? unixToDate(txData.timestamp) : "Unknown",
              },
              {
                key: "TxID",
                onPress: txData.txid != null ? this.copyTxIDToClipboard : () => {},
                data: txData.txid != null ? this.decodeTxid(txData.txid) : "Unknown",
              },
              {
                key: "Blockchain TxID",
                onPress: txData.blockchainTxId != null ? this.copyTxIDToClipboard : () => {},
                data: txData.blockchainTxId,
                condition: txData.blockchainTxId != null,
              },
              {
                key: "Message",
                data: txData.memo,
                onPress: this.copyMemoToClipboard,
                condition: txData.memo != null && txData.memo.length > 0,
                numLines: 100,
              },
            ]}
          />
          {txData.deposit && (
            <Button onPress={() => this.goToManageTab()}>{"Complete this deposit"}</Button>
          )}
        </SafeAreaView>
      </SemiModal>
    );
  }
}

export default TxDetailsModal;
