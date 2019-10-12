/*
  This component works very similarly to ConfirmSend, 
  in that it takes in the parameters to send and signs
  a transaction. Unlike ConfirmSend, this component
  pushes the transaction to the blockchain and displays
  the result. This component should always be resetTo,
  so that the navigation stack get reset when a transaction
  is sent.
*/

import React, { Component } from "react"
import Button1 from "../../../../symbols/button1"
import { connect } from 'react-redux'
import { sendRawTx } from '../../../../utils/httpCalls/callCreators'
import { networks } from 'bitgo-utxo-lib'
import { 
  View, 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  Linking, 
  Alert,
  Clipboard
 } from "react-native"
import { satsToCoins, truncateDecimal } from '../../../../utils/math'
import { explorers } from '../../../../utils/CoinData'
import { 
  needsUpdate, 
  transactionsNeedUpdate,
  setActiveCoin, 
  setActiveApp,
  setActiveSection
 } from '../../../../actions/actionCreators'
import ProgressBar from 'react-native-progress/Bar'
import { Icon } from 'react-native-elements'
import { NO_VERIFICATION, MID_VERIFICATION } from '../../../../utils/constants'
import styles from './SendResult.styles'

const TIMEOUT_LIMIT = 120000
const LOADING_TICKER = 5000

class SendResult extends Component {
  constructor(props) {
    super(props)
    this.state = {
        toAddress: "",
        fromAddress: "",
        err: false,
        coinObj: {},
        utxoCrossChecked: false,
        loading: true,
        network: null,
        fee: 0,
        amount: 0,
        txid: "",
        remainingBalance: 0,
        loadingProgress: 0.175,
        loadingMessage: "Preparing transaction..."
    };
  }

  componentDidMount() {
    const coinObj = this.props.navigation.state.params.data.coinObj
    const activeUser = this.props.navigation.state.params.data.activeUser
    const toAddress = this.props.navigation.state.params.data.toAddress
    const fromAddress = this.props.navigation.state.params.data.fromAddress
    const amount = Number(this.props.navigation.state.params.data.amount)
    const fee = coinObj.id === 'BTC' ? { feePerByte: Number(this.props.navigation.state.params.data.btcFee) } : Number(this.props.navigation.state.params.data.coinObj.fee)
    const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
    
    this.timeoutTimer = setTimeout(() => {
      if (this.state.loading) {
        this.setState({
          err: 'timed out while trying to send transaction', 
          loading: false,
          coinObj: coinObj,
        })
      }
    }, TIMEOUT_LIMIT)

    this.loadingInterval = setInterval(() => {
      this.tickLoading()
    }, LOADING_TICKER);

    let verifyMerkle, verifyTxid

    if (this.props.coinSettings[coinObj.id]) {
      verifyMerkle = this.props.coinSettings[coinObj.id].verificationLvl > MID_VERIFICATION ? true : false
      verifyTxid = this.props.coinSettings[coinObj.id].verificationLvl > NO_VERIFICATION ? true : false 
    } else {
      console.warn(`No coin settings data found for ${coinObj.id} in SendResult, assuming highest verification level`)
      verifyMerkle = true
      verifyTxid = true
    }

    sendRawTx(coinObj, activeUser, toAddress, amount, fee, network, verifyMerkle, verifyTxid)
    .then((res) => {
      if(res.err || !res) {
        this.setState({
          loading: false,
          err: res.result,
          coinObj: coinObj,
        });
        clearInterval(this.loadingInterval);
      } else {
        clearInterval(this.loadingInterval);
        this.setState({
          loading: false,
          txid: res.result,
          remainingBalance: this.props.balances[coinObj.id].result.confirmed - (amount + fee),
          toAddress: toAddress,
          fromAddress: fromAddress,
          coinObj: coinObj,
          network: network,
          fee: coinObj.id === 'BTC' ? fee.feePerByte : fee,
          amount: amount,
        });
        this.props.dispatch(needsUpdate("balances"))
        this.props.dispatch(needsUpdate("rates"))
        this.props.dispatch(transactionsNeedUpdate(coinObj.id, this.props.needsUpdate.transanctions))
      }
    })
    .catch((e) => {
      this.setState({
        loading: false,
        err: e.message ? e.message : "Unknown error while building transaction, double check form data"
      });
      console.log(e)
    })
  }

  componentWillUnmount() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }

  openExplorer = () => {
    let url = `${explorers[this.state.coinObj.id]}/tx/${this.state.txid}`
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  }

  navigateToScreen = (coinObj, route) => {
    let navigation = this.props.navigation
    let data = {}

    if (route === "Send") {
      data = {
        coinObj: coinObj,
        balance: this.props.balances[coinObj.id].result.confirmed,
        activeAccount: this.props.activeAccount
      }
    } else {
      data = coinObj
    }

    navigation.navigate(route, {
      data: data
    });
  }

  backToCoin = () => {
    let coinObj = this.state.coinObj

    let navigation = this.props.navigation  
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(coinObj.defaultApp))
    this.props.dispatch(setActiveSection(coinObj.apps[coinObj.defaultApp].data[0]))

    navigation.navigate("CoinMenus", { title: 'Overview' });
  }

  copyTxIDToClipboard = () => {
    Clipboard.setString(this.state.txid);
    Alert.alert("ID Copied", "Transaction ID copied to clipboard")
  }

  tickLoading = () => {
    //This is cheeky but it actually does all these things
    let loadingMessages = [
      'Bundling transaction info...',
      'Verifying transaction info again...',
      'Verifying merkle root again...',
      'Signing Transaction...'
    ]
    
    let index = 0

    while (index < loadingMessages.length && loadingMessages[index] !== this.state.loadingMessage) {
      index++
    }

    if (index < (loadingMessages.length - 1)) {
      this.setState({loadingMessage: loadingMessages[index+1], loadingProgress: this.state.loadingProgress + 0.175})
    } else if (index === loadingMessages.length) {
      this.setState({loadingMessage: loadingMessages[0], loadingProgress: this.state.loadingProgress + 0.175})
    }
  }

  renderTransactionResult = () => {
    clearTimeout(this.timeoutTimer);
    return(
      <View style={styles.root}>
        <Text style={styles.verifiedLabel}>Sent</Text>
        <View style={styles.rect} />
        <ScrollView style={{width:"100%", height:"100%"}}>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Status:</Text>
              <Text style={styles.infoText}>Success!</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Amount Sent:</Text>
              <Text style={styles.infoText}>{truncateDecimal(satsToCoins(this.state.amount), 8) + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>From:</Text>
              <Text style={styles.addressText}>{this.state.fromAddress}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>To:</Text>
              <Text style={styles.addressText}>{this.state.toAddress}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>{this.state.coinObj.id === 'BTC' ? 'Fee/byte: ' : 'Fee: '}</Text>
              <Text style={styles.infoText}>{satsToCoins(this.state.fee) + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>ID:</Text>
              <Text style={styles.addressText}>{this.state.txid}</Text>
            </View>
            <TouchableOpacity onPress={this.copyTxIDToClipboard}>
              <Icon name="content-copy" size={25} color="#E9F1F7"/>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonContainer}>
            { explorers[this.state.coinObj.id] &&
              <Button1 style={styles.explBtn} buttonContent="Explorer" onPress={() => this.openExplorer()} />
            }
            <Button1 style={styles.homeBtn} 
            buttonContent="Home" 
            onPress={() => {this.navigateToScreen(this.state.coinObj, "Home")}}/>
          </View>
        </ScrollView>
      </View>
    )
  }

  renderError = () => {
    clearTimeout(this.timeoutTimer);
    return(
      <View style={styles.root}>
        <Text style={styles.errorLabel}>Error</Text>
        <View style={styles.rect} />
        <ScrollView style={{width:"100%", height:"100%"}}>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Status:</Text>
              <Text style={styles.infoText}>Error</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Error Type:</Text>
              <Text style={styles.addressText}>{this.state.err}</Text>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button1 style={styles.homeBtn} 
            buttonContent="Home" 
            onPress={() => {this.navigateToScreen(this.state.coinObj, "Home")}}/>
          </View>
        </ScrollView>
      </View>
    )
  }

  renderLoading = () => {
    return(
      <View style={styles.loadingRoot}>
        <ProgressBar progress={this.state.loadingProgress} width={200} color='#2E86AB'/>
        <Text style={styles.loadingLabel}>{this.state.loadingMessage}</Text>
      </View>
    )
  }

  render() {
    return (
        this.state.loading ? this.renderLoading() : this.state.err ? this.renderError() : this.renderTransactionResult()
    );
  }
}

const mapStateToProps = (state) => {
  return {
    balances: state.ledger.balances,
    needsUpdate: state.ledger.needsUpdate,
    activeAccount: state.authentication.activeAccount,
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(SendResult);