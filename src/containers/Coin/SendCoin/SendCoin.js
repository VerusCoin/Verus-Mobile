/*
  This screen is where the user goes if they 
  want to send a transaction of a particular coin. The goal is
  to give them easy access to all sending relating functions. 
  While this means the ability to enter an amount, an adress, and 
  send, it also means easy access to things like VerusPay. If given 
  the option, a user shouldn't have to always enter in a complicated 
  address to send to manually.
*/

import React, { Component } from "react"
import Button1 from "../../../symbols/button1"
import { FormLabel, FormInput, FormValidationMessage, } from "react-native-elements"
import {
  View,
  Text,
  Alert,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
  Image
} from "react-native"
import { satsToCoins, truncateDecimal, isNumber, coinsToSats } from '../../../utils/math'
import { updateCoinBalances, setCoinRates } from '../../../actions/actionCreators'
import { connect } from "react-redux";
import { getRecommendedBTCFees } from '../../../utils/httpCalls/callCreators'
import { removeSpaces } from '../../../utils/stringUtils'
import styles from './SendCoin.styles'
import Colors from '../../../globals/colors';

const VERUSPAY_LOGO_DIR = require('../../../images/customIcons/verusPay.png')
const DEFAULT_FEE_GUI = 10000;

class SendCoin extends Component {
  constructor(props) {
    super(props)
    this.state = {
        coin: {name: ""},
        balances: {},
        account: "none",
        fromAddress: '',
        toAddress: '',
        amount: 0,
        btcFees: {},
        loadingBTCFees: false,
        loading: false,
        btcFeesErr: false,
        activeCoinsForUser: {},
        formErrors: {toAddress: null, amount: null},
        spendableBalance: 0
    };
  }

  componentDidMount() {
    this.initializeState()
  }

  initializeState = () => {
    this.setState({
      coin: this.props.activeCoin,
      account: this.props.activeAccount, 
      activeCoinsForUser: this.props.activeCoinsForUser,
      toAddress: this.props.data ? this.props.data.address : null
    }, () => {
      const activeUser = this.state.account
      const coinObj = this.state.coin
      const activeCoinsForUser = this.state.activeCoinsForUser
      const balances = this.props.balances
      this.handleState(activeUser, coinObj, activeCoinsForUser, balances)
    }); 
  }

  handleState = (activeUser, coinObj, activeCoinsForUser, balances) => {
    let promiseArray = []
    let index = 0;

    if (activeUser.keys.hasOwnProperty(coinObj.id)) {
      this.setState({ fromAddress: activeUser.keys[coinObj.id].pubKey });  
    } else {
      throw new Error("SendCoin.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinObj[i].id + " not found!");
    }

    if(this.props.needsUpdate.rates) {
      console.log("Rates need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }  
      promiseArray.push(setCoinRates(activeCoinsForUser))
    }
    
    if(this.props.needsUpdate.balances) {
      console.log("Balances need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }  
      promiseArray.push(updateCoinBalances(balances, activeCoinsForUser, activeUser))
    } 

    if(coinObj.id === 'BTC' && !this.state.loadingBTCFees) {
      this.setState({ loadingBTCFees: true });  
    }

    this.updateProps(promiseArray)
  }

  handleFormError = (error, field) => {
    let _errors = this.state.formErrors
    _errors[field] = error

    this.setState({formErrors: _errors})
  }

  updateProps = (promiseArray) => {
    return new Promise((resolve, reject) => {
      Promise.all(promiseArray)
        .then((updatesArray) => {
          if (updatesArray.length > 0) {
            for (let i = 0; i < updatesArray.length; i++) {
              if(updatesArray[i]) {
                this.props.dispatch(updatesArray[i])
              }
            }
            if (this.state.loading) {
              this.setState({ loading: false });  
            }
            return true
          }
          else {
            return false
          }
        })
        .then((res) => {
          if (this.state.coin.id === 'BTC') {
            return getRecommendedBTCFees()
          } 
          else {
            return false
          }
        })
        .then((res) => {
          if (res) {
            console.log("BTC FEES:")
            console.log(res)
            this.setState({ 
              btcFees: res,
              loadingBTCFees: false
             });  
          } else if (this.state.coin.id === 'BTC'){
            this.setState({ 
              btcFeesErr: true,
              loadingBTCFees: false
             });
          }
        })
    }) 
  }

  goToConfirmScreen = (coinObj, activeUser, address, amount) => {
    const route = "ConfirmSend"
    let navigation = this.props.navigation
    let data = {
      coinObj: coinObj,
      activeUser: activeUser,
      address: address,
      amount: coinsToSats(Number(amount)),
      btcFee: this.state.btcFees.average,
      balance: this.props.balances[coinObj.id].result.confirmed
    }

    navigation.navigate(route, {
      data: data
    });
  }

  fillAddress = (address) => {
    this.setState({ toAddress: address });  
  }

  fillAmount = (amount) => {
    let amountToFill = amount
    if (amount < 0) {
      amountToFill = 0
    }
    this.setState({ amount: amountToFill });  
  }

  _verusPay = () => {
    let navigation = this.props.navigation  

    navigation.navigate("VerusPay", { fillAddress: this.fillAddress, fillAmount: this.fillAmount });
  }

  //TODO: Add fee to Bitcoin object in CoinData

  validateFormData = () => {
    this.setState({
      formErrors: {toAddress: null, amount: null}
    }, () => {
      const coin = this.state.coin

      const spendableBalance = coin.id === 'BTC' ? 
      truncateDecimal(this.props.balances[this.props.activeCoin.id].result.confirmed, 4) 
      : 
      this.props.balances[this.props.activeCoin.id].result.confirmed - (this.props.activeCoin.fee ? this.props.activeCoin.fee : 10000)
      
      const toAddress = removeSpaces(this.state.toAddress)
      const fromAddress = this.state.fromAddress
      const amount = (((this.state.amount.toString()).includes(".") && 
                    (this.state.amount.toString()).includes(",")) || 
                    !this.state.amount) ? 
                      this.state.amount 
                    : 
                      (this.state.amount.toString()).replace(/,/g, '.')
      const account = this.state.account
      let _errors = false


      if (!toAddress || toAddress.length < 1) {
        this.handleFormError("Required field", "toAddress")
        _errors = true
      } else if (toAddress.length < 34 || toAddress.length > 35 ) {
        this.handleFormError("Invalid address", "toAddress")
        _errors = true
      }

      if (!(amount.toString())) {
        this.handleFormError("Required field", "amount")
        _errors = true
      } else if (!(isNumber(amount))) {
        this.handleFormError("Invalid amount", "amount")
        _errors = true
      } else if (coinsToSats(Number(amount)) > Number(spendableBalance)) {
        this.handleFormError(("Insufficient funds, " + (spendableBalance < 0 ? "available amount is less than fee" : truncateDecimal(satsToCoins(spendableBalance), 4) + " available")), "amount")
        _errors = true
      }

      if (!coin) {
        Alert.alert("No active coin", "no current active coin")
        _errors = true
      }

      if (!account) {
        Alert.alert("No active account", "no current active account")
        _errors = true
      }

      if (!fromAddress) {
        Alert.alert("No from address", "no current active from address")
        _errors = true
      }

      if (!_errors) {
        this.goToConfirmScreen(coin, account, toAddress, amount)
      }
    });
  }

  

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center"}}>
          <TouchableOpacity onPress={
            this.props.balances.hasOwnProperty(this.props.activeCoin.id) ? 
            (() => this.fillAmount(satsToCoins(this.props.balances[this.props.activeCoin.id].result.confirmed - (this.props.activeCoin.fee ? this.props.activeCoin.fee : 10000))))
            :
            (() => {return 0})
            }>
            <Text style={styles.coinBalanceLabel}>
              {(this.props.balances && this.state.coin.id && this.props.balances[this.state.coin.id]) ?
                (typeof(this.props.balances[this.state.coin.id].result.confirmed) !== 'undefined' ? 
                truncateDecimal(satsToCoins(this.props.balances[this.state.coin.id].result.confirmed), 4) + ' ' + this.state.coin.id 
                :
                null)
              :
              null
              }
            </Text>
          </TouchableOpacity>
          <Text style={styles.sendLabel}>{"Send " + this.state.coin.name}</Text>
          <View style={styles.valueContainer}>
              <FormLabel labelStyle={styles.formLabel}>
              To:
              </FormLabel>
              <FormInput 
                underlineColorAndroid={Colors.quinaryColor}
                onChangeText={(text) => this.setState({toAddress: removeSpaces(text)})}
                onSubmitEditing={Keyboard.dismiss}
                value={this.state.toAddress}
                autoCapitalize={"none"}
                autoCorrect={false}
                shake={this.state.formErrors.toAddress}
                inputStyle={styles.formInput}
              />
              <FormValidationMessage>
              {
                this.state.formErrors.toAddress ? 
                  this.state.formErrors.toAddress
                  :
                  null
              }
              </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
              <FormLabel labelStyle={styles.formLabel}>
              Amount:
              </FormLabel>
              <FormInput 
                underlineColorAndroid={Colors.quinaryColor}
                onChangeText={(text) => this.setState({amount: text})}
                onSubmitEditing={Keyboard.dismiss}
                value={this.state.amount.toString()}
                shake={this.state.formErrors.amount}
                inputStyle={styles.formInput}
                keyboardType={"decimal-pad"}
                autoCapitalize='words'
              />
              <FormValidationMessage>
              {
                this.state.formErrors.amount ? 
                  this.state.formErrors.amount
                  :
                  null
              }
              </FormValidationMessage>
              <TouchableOpacity onPress={this._verusPay}>
                <Image
                  source={VERUSPAY_LOGO_DIR}
                  style={{width: 40, height: 40, alignSelf: "center", marginVertical: '10%'}}
                />
              </TouchableOpacity>
          </View>
          {this.state.loading ? 
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Updating balance...</Text>
              <ActivityIndicator animating={this.state.loading} size="large"/>
            </View>
          :
            this.state.loadingBTCFees ?
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading BTC Fees...</Text>
                <ActivityIndicator animating={this.state.loadingBTCFees} size="large"/>
              </View>
            :
              this.state.btcFeesErr ?
                <View style={styles.loadingContainer}>
                  <Text style={styles.errorText}>BTC Fees Error!</Text>
                </View>
              :
                this.props.balances[this.props.activeCoin.id] && this.props.balances[this.props.activeCoin.id].error ? 
                  <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Connection Error</Text>
                  </View>
                :
                  <View style={styles.buttonContainer}>
                    <Button1 style={styles.sendBtn} onPress={this.validateFormData} buttonContent="SEND"/>
                  </View>
            }
        </ScrollView>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    needsUpdate: state.ledger.needsUpdate,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoin: state.coins.activeCoin,
    balances: state.ledger.balances,
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(SendCoin);