import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { Icon, FormLabel, FormInput, FormValidationMessage, } from "react-native-elements";
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
  Image
} from "react-native";
import { satsToCoins, truncateDecimal, isNumber, coinsToSats } from '../utils/math';
import { updateCoinBalances, setCoinRates } from '../actions/actionCreators';
import { connect } from "react-redux";
import { getRecommendedBTCFees } from '../utils/httpCalls/callCreators'
import { removeSpaces } from '../utils/stringUtils'

const VERUSPAY_LOGO_DIR = require('../images/customIcons/verusPay.png')
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
    let index = 0
    this.setState({ 
      coin: this.props.activeCoin,
      account: this.props.activeAccount, 
      activeCoinsForUser: this.props.activeCoinsForUser,
      spendableBalance: this.props.balances[this.props.activeCoin.id].result.confirmed - (this.props.activeCoin.fee ? this.props.activeCoin.fee : 10000)
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

    while (index < activeUser.keys.length && coinObj.id !== activeUser.keys[index].id) {
      index++
    }
    if (index < activeUser.keys.length) {
      this.setState({ fromAddress: activeUser.keys[index].pubKey });  
    }
    else {
      throw "SendCoin.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinObj[i].id + " not found!";
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
      const spendableBalance = coin.id === 'BTC' ? truncateDecimal(this.props.balances[this.props.activeCoin.id].result.confirmed, 4) : this.state.spendableBalance
      const toAddress = removeSpaces(this.state.toAddress)
      const fromAddress = this.state.fromAddress
      const amount = this.state.amount
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
          <TouchableOpacity onPress={() => this.fillAmount(satsToCoins(this.state.spendableBalance))}>
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
                onChangeText={(text) => this.setState({amount: text})}
                onSubmitEditing={Keyboard.dismiss}
                value={this.state.amount.toString()}
                shake={this.state.formErrors.amount}
                inputStyle={styles.formInput}
                keyboardType={"numeric"}
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
                  style={{width: 40, height: 40, alignSelf: "center"}}
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
                  <Text style={styles.loadingText}>BTC Fees Error!</Text>
                </View>
              :
                <View style={styles.buttonContainer}>
                  <Button1 style={styles.sendBtn} onPress={this.validateFormData} buttonContent="Send"/>
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

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  formInput: {
    width: "100%",
  },
  /*labelContainer: {
    //borderWidth:1,
    //borderColor:"blue",
  },*/
  valueContainer: {
    width: "85%",
    //borderWidth:1,
    //borderColor:"blue",
  },
  /*addressInput: {
    width: "100%",
    color: "#009B72"
  },
  image: {
    height: 48,
    width: 48,
    marginTop: 65
  },*/
  coinBalanceLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 25,
    textAlign: "center",
    color: "#009B72",
    width: 359,
  },
  /*walletLabel: {
    width: 244,
    height: 23,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 13,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },*/
  sendLabel: {
    width: "100%",
    backgroundColor: "#E9F1F7",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#232323"
  },
  /*rect: {
    height: 1,
    width: 359,

    backgroundColor: "rgb(230,230,230)"
  },*/
  buttonContainer: {
    height: 45,
    width: 400,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 8,
    marginTop: 28
  },
  loadingContainer: {
    width: 400,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 8,
    marginTop: 28
  },
  /*iconContainer: {
    height: 20,
    width: 400,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 0,
    marginTop: 0
  },*/
  sendBtn: {
    width: 104,
    height: 45,
    backgroundColor: "#009B72",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  /*receiveBtn: {
    width: 104,
    height: 45,
    backgroundColor: "rgba(68,206,147,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  fromLabel: {
    width: 244,
    height: 27,

    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 3,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  fromAddress: {
    width: 339,
    height: 18,

    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 16,
    textAlign: "center",
    color: "#E9F1F7"
  },
  text3: {
    width: 244,
    height: 26,

    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 0,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  textInput: {
    width: 263,
    height: 41,
    marginTop: 0,
    marginBottom: 0,
    fontSize: 20,
    textAlign: "center",
    color: "#E9F1F7"
  },
  addressInput: {
    width: 339,
    height: 41,
    marginTop: 0,
    marginBottom: 0,
    fontSize: 16,
    textAlign: "center",
    color: "#E9F1F7"
  },
  text4: {
    width: 244,
    height: 26,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 0,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },*/
  loadingText: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },/*
  icon: {
    backgroundColor: "transparent",
    fontSize: 40,
  },
  textInput2: {
    width: 339,
    height: 30,

    marginTop: 0,
    marginBottom: 0,
    fontSize: 16,
    textAlign: "center",
    color: "#E9F1F7"
  }
  */
});