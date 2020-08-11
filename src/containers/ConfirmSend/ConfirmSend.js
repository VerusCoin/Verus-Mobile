/*
  This screen is to show the user the result of their transaction
  pre-flight check, and the details of their transaction. It is passed
  transaction data from the sendCoin component, and builds a model transaction
  using that data + the user's authentication data that they decrypted while entering
  their password. NO TRANSACTION IS SENT YET.
*/

import React, { Component } from "react";
import StandardButton from "../../components/StandardButton";
import { connect } from 'react-redux';
import { txPreflight } from '../../utils/api/channels/electrum/callCreators';
import { networks } from 'bitgo-utxo-lib';
import { View, Text, ScrollView, Keyboard, Alert } from "react-native";
import { satsToCoins, truncateDecimal, coinsToSats } from '../../utils/math';
import ProgressBar from 'react-native-progress/Bar';
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { NO_VERIFICATION, MID_VERIFICATION } from '../../utils/constants/constants'
import Styles from '../../styles/index'
import Colors from "../../globals/colors";

const TIMEOUT_LIMIT = 120000
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
      amountSubmitted: 0,
      balance: 0,
      remainingBalance: 0,
      finalTxAmount: 0,
      memo: null,
      loadingProgress: 0.175,
      loadingMessage: "Creating transaction...",
      btcFeePerByte: null,
      feeTakenFromAmount: false
    };
  }

  componentDidMount() {
    const coinObj = this.props.route.params.data.coinObj
    const activeUser = this.props.route.params.data.activeUser
    const address = this.props.route.params.data.address
    const amount = Number(this.props.route.params.data.amount)
    const fee = coinObj.id === 'BTC' ? { feePerByte: Number(this.props.route.params.data.btcFee) } : Number(this.props.route.params.data.coinObj.fee)
    const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
    const balance = Number(this.props.route.params.data.balance)
    const memo = this.props.route.params.data.memo
    
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

    let verifyMerkle, verifyTxid

    if (this.props.coinSettings[coinObj.id]) {
      verifyMerkle = this.props.coinSettings[coinObj.id].verificationLvl > MID_VERIFICATION ? true : false
      verifyTxid = this.props.coinSettings[coinObj.id].verificationLvl > NO_VERIFICATION ? true : false 
    } else {
      console.warn(`No coin settings data found for ${coinObj.id} in ConfirmSend, assuming highest verification level`)
      verifyMerkle = true
      verifyTxid = true
    }

    txPreflight(coinObj, activeUser, address, amount, fee, network, verifyMerkle, verifyTxid)
    .then((res) => {
      if(res.err || !res) {
        this.setState({
          loading: false,
          err: res.result
        });
        clearInterval(this.loadingInterval);
      } else {
        let feeTakenFromAmount = res.result.feeTakenFromAmount
        let finalTxAmount = feeTakenFromAmount ? res.result.value : (res.result.value + coinsToSats(Number(res.result.fee)))
        let remainingBalance = balance - satsToCoins(finalTxAmount)
        clearInterval(this.loadingInterval);

        if (res.result.feeTakenFromAmount) {
          if (!res.result.unshieldedFunds) {
            Alert.alert(
              "Warning", 
              "Your transaction amount has been changed to " + satsToCoins(finalTxAmount) + " " + coinObj.id + 
              " as you do not have sufficient funds to cover your submitted amount of " + satsToCoins(res.result.amountSubmitted) + " " + coinObj.id + 
              " + a fee of " + res.result.fee + " " + coinObj.id + ".");
          } else {
            Alert.alert(
              "Warning", 
              "Your transaction amount has been changed to " + satsToCoins(finalTxAmount) + " " + coinObj.id + 
              " as you do not have sufficient funds to cover your submitted amount of " + satsToCoins(res.result.amountSubmitted) + " " + coinObj.id + 
              " + a fee of " + res.result.fee + " " + coinObj.id + ". This could be due to the " + satsToCoins(res.result.unshieldedFunds) + " in unshielded " + coinObj.id + " your " + 
              "wallet contains. Log into a native client and shield your mined funds to be able to use them." );
          }
        }
        
        this.setState({
          loading: false,
          toAddress: res.result.outputAddress,
          fromAddress: res.result.changeAddress,
          network: res.result.network,
          fee: res.result.fee,
          amountSubmitted: res.result.amountSubmitted,
          utxoCrossChecked: res.result.utxoVerified,
          coinObj: coinObj,
          activeUser: activeUser,
          balance,
          memo: memo,
          remainingBalance: remainingBalance,
          finalTxAmount: finalTxAmount,
          loadingProgress: 1,
          loadingMessage: "Done",
          btcFeePerByte: fee.feePerByte ? fee.feePerByte : null,
          feeTakenFromAmount: res.result.feeTakenFromAmount
        });
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
      amount: this.state.feeTakenFromAmount ? 
        truncateDecimal(this.state.finalTxAmount, 0) 
        : 
        (truncateDecimal(this.state.finalTxAmount, 0) - coinsToSats(Number(this.state.fee))),
      btcFee: this.state.btcFeePerByte,
    }

    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [
        { name: route, params: { data: data } },
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
              {'Confirm'}
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            ...Styles.innerHeaderFooterContainer
          }}
          style={Styles.secondaryBackground}
        >
          <View style={Styles.wideBlock}>
            <View style={Styles.infoTable}>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>From:</Text>
                <View style={Styles.infoTableCell}>
                  <Text style={Styles.blockTextAlignRight}>
                    {this.state.fromAddress}
                  </Text>
                </View>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>To:</Text>
                <View style={Styles.infoTableCell}>
                  <Text style={Styles.blockTextAlignRight}>
                    {this.state.toAddress}
                  </Text>
                </View>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Balance:</Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(this.state.balance, 8) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>
                  Amount Submitted:
                </Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(
                    satsToCoins(this.state.amountSubmitted),
                    8
                  ) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Fee:</Text>
                <Text style={Styles.infoTableCell}>
                  {this.state.fee + " " + this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Tx Amount:</Text>
                <Text
                  style={
                    this.state.feeTakenFromAmount
                      ? { ...Styles.infoTableCell, ...Styles.warningText }
                      : Styles.infoTableCell
                  }
                >
                  {truncateDecimal(
                    satsToCoins(this.state.finalTxAmount),
                    8
                  ) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>
                  Balance After Tx:
                </Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(this.state.remainingBalance, 8) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              {this.state.memo && (
                <View style={Styles.infoTableRow}>
                  <Text style={Styles.infoTableHeaderCell}>Note:</Text>
                  <View style={Styles.infoTableCell}>
                    <Text style={Styles.blockTextAlignRight}>
                      {this.state.memo}
                    </Text>
                  </View>
                </View>
              )}
              {!this.state.utxoCrossChecked && (
                <View style={Styles.infoTableRow}>
                  <Text style={Styles.infoTableHeaderCell}>Warning:</Text>
                  <View style={Styles.infoTableCell}>
                    <Text style={{...Styles.blockTextAlignRight, ...Styles.warningText}}>
                      {
                        "Funds only verified on one server, proceed at own risk!"
                      }
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        <View style={Styles.footerContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <StandardButton
              color={Colors.warningButtonColor}
              title="BACK"
              onPress={this.cancel}
            />
            <StandardButton
              color={Colors.successButtonColor}
              title="SEND"
              onPress={this.sendTx}
            />
          </View>
        </View>
      </React.Fragment>
    );
  }

  renderError = () => {
    clearTimeout(this.timeoutTimer);
    return (
      <React.Fragment>
        <View style={Styles.headerContainer}>
          <View style={Styles.centerContainer}>
            <Text style={{...Styles.mediumCentralPaddedHeader, ...Styles.errorText}}>Error</Text>
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
          <View style={Styles.infoTable}>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Error Type:</Text>
              <View style={Styles.infoTableCell}>
                <Text style={Styles.blockTextAlignRight}>
                  {this.state.err}
                </Text>
              </View>
            </View>
          </View>
          </View>
        </ScrollView>
        <View style={Styles.footerContainer}>
          <View style={Styles.fullWidthFlexCenterBlock}>
            <StandardButton
              color={Colors.warningButtonColor}
              title="BACK"
              onPress={this.cancel}
            />
          </View>
        </View>
      </React.Fragment>
    );
  }

  renderLoading = () => {
    return(
      <View style={Styles.focalCenter}>
        <ProgressBar progress={this.state.loadingProgress} width={200} color={Colors.linkButtonColor}/>
        <Text style={Styles.mediumCentralPaddedHeader}>{this.state.loadingMessage}</Text>
      </View>
    )
  }

  render() {
    return (
        this.state.loading ? this.renderLoading() : this.state.err ? this.renderError() : this.renderTransactionInfo()
    );
  }
}

const mapStateToProps = (state) => {
  return {
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(ConfirmSend);

