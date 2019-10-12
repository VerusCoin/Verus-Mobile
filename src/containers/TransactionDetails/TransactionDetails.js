/*
  This component displays the details of ta transaction selected
  from the Overview component.
*/

import React, { Component } from "react";
import Button1 from "../../symbols/button1";
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  Linking, 
  TouchableOpacity,
  Clipboard,
  Alert
} from "react-native";
import { connect } from 'react-redux';
import { unixToDate } from '../../utils/math';
import { explorers } from '../../utils/CoinData';
import { truncateDecimal } from '../../utils/math';
import { Icon } from 'react-native-elements';
import styles from './TransactionDetails.styles';

const SELF = require('../../images/customIcons/selfArrow.png')
const OUT = require('../../images/customIcons/outgoingArrow.png')
const IN = require('../../images/customIcons/incomingArrow.png')
const UNKNOWN = require('../../images/customIcons/unknownLogo.png')
const INTEREST = require('../../images/customIcons/interestPlus.png')

class TransactionDetails extends Component {
  constructor(props) {
    super(props)
    this.state = {
        txData: {},
        parsedAmount: 0,
        txLogo: UNKNOWN,
        activeCoinID: ''
    };
  }

  componentDidMount() {
    this.setState({
      txData: Array.isArray(this.props.navigation.state.params.data.tx) ? this.props.navigation.state.params.data.tx[0] : this.props.navigation.state.params.data.tx,
      parsedAmount: this.props.navigation.state.params.data.amount,
      activeCoinID: this.props.navigation.state.params.data.coinID
    }, () => {
      this.chooseTxLogo();
    });
  }

  openExplorer = () => {
    let url = `${explorers[this.state.activeCoinID]}/tx/${this.state.txData.txid}`
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  }

  chooseTxLogo = () => {
    const type = this.state.txData.type
    const _amount = this.state.txData.amount

    if (type === 'self') {
      if (_amount < 0) {
        image = INTEREST
      }
      else {
        image = SELF
      }
    }
    else if (type === 'received') {
      image = IN
    }
    else if (type === 'sent') {
      image = OUT
    }

    this.setState({ txLogo: image });
  }

  copyTxIDToClipboard = () => {
    Clipboard.setString(this.state.activeCoinID === 'BTC' ? this.decodeBtcTxid(this.state.txData.txid) : this.state.txData.txid);
    Alert.alert("ID Copied", "Transaction ID copied to clipboard")
  }

  //TODO: Move this higher up to txid source
  decodeBtcTxid = () => {
    //Decode decimal txid to hex string
    let txid = this.state.txData.txid
    let txidArr = txid.split(",")

    for (let i = 0; i < txidArr.length; i++) {
      txidArr[i] = Number(txidArr[i]).toString(16)
      if (!(isNaN(Number(txidArr[i]))) && txidArr[i].length === 1) {
        txidArr[i] = "0" + txidArr[i]
      }
    }
    
    return txidArr.join('')
  }
  
  render() {
    const {state} = this.props.navigation;
    return (
      <View style={styles.root}>
        <Image
          style={{width: 50, height: 50, marginTop: 5}}
          source={this.state.txLogo}
        />
        <Text style={styles.homeLabel}>Transaction Details</Text>
        <View style={styles.rect} />
        <ScrollView style={{width:"100%", height:"100%"}}>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Type:</Text>
              <Text style={styles.infoText}>{this.state.txData.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Amount:</Text>
              <Text style={styles.infoText}>{truncateDecimal(this.state.parsedAmount, 8) + ' ' + this.state.activeCoinID}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Confirmations:</Text>
              <Text style={styles.infoText}>{this.state.txData.confirmations}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Address:</Text>
              <Text style={styles.addressText}>{this.state.txData.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Time:</Text>
              <Text style={styles.infoText}>{unixToDate(this.state.txData.timestamp)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>ID:</Text>
              <Text style={styles.addressText}>{this.state.activeCoinID === 'BTC' ? this.decodeBtcTxid(this.state.txData.txid) : this.state.txData.txid}</Text>
            </View>
            <TouchableOpacity onPress={this.copyTxIDToClipboard}>
              <Icon name="content-copy" size={25} color="#E9F1F7"/>
            </TouchableOpacity>
            { explorers[this.state.activeCoinID] &&
            <Button1 style={styles.explorerBtn} buttonContent="Explorer" onPress={() => this.openExplorer()} />
            }
          </View>
        </ScrollView>

      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    balances: state.ledger.balances,
    needsUpdate: state.ledger.needsUpdate
  }
};

export default connect(mapStateToProps)(TransactionDetails);
