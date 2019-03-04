import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { connect } from 'react-redux';
import { txPreflight, sendRawTx } from '../utils/httpCalls/callCreators';
import { networks } from 'bitgo-utxo-lib';
import { View, StyleSheet, Alert, Text, ScrollView, Keyboard } from "react-native";
import { satsToCoins, truncateDecimal } from '../utils/math';
import ProgressBar from 'react-native-progress/Bar';
import { NavigationActions } from 'react-navigation';


const TIMEOUT_LIMIT = 60000
const LOADING_TICKER = 5000

class ConfirmSend extends Component {
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
        balance: 0,
        remainingBalance: 0,
        guiAmount: 0,
        memo: null,
        loadingProgress: 0.175,
        loadingMessage: "Creating transaction...",
        btcFeePerByte: null
    };
  }

  componentDidMount() {
    const coinObj = this.props.navigation.state.params.data.coinObj
    const activeUser = this.props.navigation.state.params.data.activeUser
    const address = this.props.navigation.state.params.data.address
    const amount = Number(this.props.navigation.state.params.data.amount)
    const fee = coinObj.id === 'BTC' ? { feePerByte: Number(this.props.navigation.state.params.data.btcFee) } : Number(this.props.navigation.state.params.data.coinObj.fee)
    const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
    const balance = Number(this.props.navigation.state.params.data.balance)
    const memo = this.props.navigation.state.params.data.memo
    
    this.timeoutTimer = setTimeout(() => {
      if (this.state.loading) {
        this.setState(
          {err: 'timed out while trying to build transaction, this may be a networking error, try sending again', 
          loading: false})
      }
    }, TIMEOUT_LIMIT)

    this.loadingInterval = setInterval(() => {
      this.tickLoading()
    }, LOADING_TICKER);

    txPreflight(coinObj, activeUser, address, amount, fee, network, true)
    .then((res) => {
      if(res.err || !res) {
        this.setState({
          loading: false,
          err: res.result
        });
        clearInterval(this.loadingInterval);
      } else {
        let balanceCoins = satsToCoins(balance)
        let guiAmount = satsToCoins(amount) + (coinObj.id === 'BTC' ? Number(res.result.fee) : satsToCoins(fee))
        let remainingBalance = balanceCoins - guiAmount
        clearInterval(this.loadingInterval);
        
        this.setState({
          loading: false,
          toAddress: res.result.outputAddress,
          fromAddress: res.result.changeAddress,
          network: res.result.network,
          fee: res.result.fee,
          amount: res.result.value,
          utxoCrossChecked: res.result.utxoVerified,
          coinObj: coinObj,
          activeUser: activeUser,
          balance: balanceCoins,
          memo: memo,
          remainingBalance: remainingBalance,
          guiAmount: guiAmount,
          loadingProgress: 1,
          loadingMessage: "Done",
          btcFeePerByte: fee.feePerByte ? fee.feePerByte : null
        });
      }
    })
    .catch((e) => {
      this.setState({
        loading: false,
        err: "Unknown error while building transaction, double check form data"
      });
      console.log(e)
    })
  }

  componentWillUnmount() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }
  
  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  sendTx = () => {
    Keyboard.dismiss();
    const route = "SendResult"
    let navigation = this.props.navigation
    let data = {
      coinObj: this.state.coinObj,
      activeUser: this.state.activeUser,
      toAddress: this.state.toAddress,
      fromAddress: this.state.fromAddress,
      amount: truncateDecimal(this.state.amount, 0),
      btcFee: this.state.btcFeePerByte,
    }

    const resetAction = NavigationActions.reset({
      index: 0, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: route, params: {data: data} }),
      ],
    })

    navigation.dispatch(resetAction)
  }

  

  tickLoading = () => {
    //This is cheeky but it actually does all these things
    let loadingMessages = [
      'Bundling transaction info...',
      'Verifying transaction info...',
      'Verifying merkle root...',
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

  renderTransactionInfo = () => {
    clearTimeout(this.timeoutTimer);
    return(
      <View style={styles.root}>
        <Text style={styles.verifiedLabel}>Verified</Text>
        <View style={styles.rect} />
        <ScrollView style={{width:"100%", height:"100%"}}>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Status:</Text>
              <Text style={styles.infoText}>Verified!</Text>
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
              <Text style={styles.infoText}>Balance:</Text>
              <Text style={styles.infoText}>{truncateDecimal(this.state.balance, 8) + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Amount Submitted:</Text>
              <Text style={styles.infoText}>{truncateDecimal(satsToCoins(this.state.amount), 8) + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Fee:</Text>
              <Text style={styles.infoText}>{this.state.fee + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Tx Amount:</Text>
              <Text style={styles.infoText}>{truncateDecimal(this.state.guiAmount, 8) + ' ' + this.state.coinObj.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Balance After Tx:</Text>
              <Text style={styles.infoText}>{truncateDecimal(this.state.remainingBalance, 8) + ' ' + this.state.coinObj.id}</Text>
            </View>
            { this.state.memo && 
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Note:</Text>
              <Text style={styles.addressText}>{this.state.memo}</Text>
            </View>
            }
            { !this.state.utxoCrossChecked &&
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Warning:</Text>
              <Text style={styles.addressText}>Funds only verified on one server, proceed at own risk!</Text>
            </View>
            }
          </View>
          <View style={styles.buttonContainer}>
          <Button1 style={styles.cancelBtn} 
            buttonContent="Cancel" 
            onPress={this.cancel}/>
          <Button1 style={styles.confirmBtn} 
            buttonContent="Send" 
            onPress={this.sendTx}/>
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
            <Button1 
            style={styles.cancelBtn} 
            buttonContent="back" 
            onPress={this.cancel}
            />
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
        this.state.loading ? this.renderLoading() : this.state.err ? this.renderError() : this.renderTransactionInfo()
    );
  }
}

export default connect()(ConfirmSend);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  loadingRoot: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: "#E9F1F7"
  },
  addressText: {
    fontSize: 16,
    color: "#E9F1F7",
    width: "65%",
    textAlign: "right"
  },
  /*warningText: {
    fontSize: 16,
    color: "#E9F1F7",
    width: "70%",
    textAlign: "center"
  },*/
  rect: {
    height: 1,
    width: 360,
    backgroundColor: "rgb(230,230,230)"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  errorLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "rgba(206,68,70,1)"
  },
  verifiedLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 15,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "rgba(68,206,147,1)"
  },
  /*explorerBtn: {
    backgroundColor: "rgba(68,152,206,1)",
    flex: 1,
    paddingTop: 6,
    paddingBottom: 6,
    marginTop: 10,
    alignSelf: "center",
  },*/
  cancelBtn: {
    width: 104,
    height: 45,
    backgroundColor: "rgba(206,68,70,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  confirmBtn: {
    width: 104,
    height: 45,
    backgroundColor: "#009B72",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  buttonContainer: {
    height: 54,
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 5,
    marginBottom: 8,
    marginTop: 8,
    left: "0%"
  },
  /*overBox: {
    width: "100%",
    height: "100%",
  }*/
});