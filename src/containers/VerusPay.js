import React, { Component } from "react";
import {
  View,
  StyleSheet,
  Text,
  Alert
} from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import { isJson } from '../utils/objectManip'
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { namesList } from '../utils/CoinData'
import { getRecommendedBTCFees } from '../utils/httpCalls/callCreators'
import { 
  updateCoinBalances,
  setUserCoins,
  addKeypair,
  transactionsNeedUpdate,
  needsUpdate,
  addExistingCoin
 } from '../actions/actionCreators'
import Spinner from 'react-native-loading-spinner-overlay';
import AlertAsync from "react-native-alert-async";
import { coinsToSats } from '../utils/math'

const FORMAT_UNKNOWN = "QR Data format unrecognized"
const ADDRESS_ONLY = "Only address detected, please fill out amount field"
const INCOMPLETE_VERUS_QR = "VerusQR code impartial or incomplete, cannot parse QR data"
const INSUFFICIENT_FUNDS = "Insufficient funds"
const BTC_FEES_ERR = "Error fetching btc fees"

class VerusPay extends Component {
  constructor(props) {
    super(props)
    this.state = {
      btcFeesErr: false,
      loading: false,
      loadingBTCFees: false,
      fromHome: true,
      btcFees: {},
      spinnerOverlay: false,
      spinnerMessage: "Loading...",
      coinObj: null,
      activeUser: null,
      address: null,
      amount: null,
      memo: null,
    };
  }

  componentDidMount() {
    if (this.props.navigation.state.params && this.props.navigation.state.params.fillAddress) {
      this.setState({ fromHome: false });  
    }
  }

  componentWillUnmount() {
    if (this.props.navigation.state.params && this.props.navigation.state.params.refresh) {
      this.props.navigation.state.params.refresh()
    }
  }

  //TODO: Allow veruspay from home to open send screen of a coin with address 
  //filled in but value still empty
  onSuccess(e) {
    console.log(e)
    let result = e.data
    
    if(isJson(result)) {
      let resultParsed = JSON.parse(result)
      console.log(resultParsed)
      
      if (resultParsed.verusQR) {
        console.log("handling verusPay")
        this.handleVerusQR(resultParsed)
      } else {
        //TODO: Handle other style QR codes here
        if (resultParsed.address && resultParsed.amount && resultParsed.coin) {
          let resultConverted = {
            coinTicker: resultParsed.coin,
            amount: coinsToSats(resultParsed.amount),
            address: resultParsed.address
          }

          this.handleVerusQR(resultConverted)
        } else {
          this.errorHandler(FORMAT_UNKNOWN)
        }
      }
    } else {
      let coinbaseAddr = this.isCoinbaseQR(result)

      if (coinbaseAddr) {
        this.addressOnly(coinbaseAddr)
      } else if (result.length >= 34 && result.length <= 35) {
        this.addressOnly(result)
      } else {
        this.errorHandler(FORMAT_UNKNOWN)
      }
    }
  }

  errorHandler = (error) => {
    Alert.alert("Error", error);
    this.props.navigation.dispatch(NavigationActions.back())
  }

  //Coinbase qr returns a string in the following format:
  //<coinName>:<address>
  isCoinbaseQR = (qrString) => {
    let splitString = qrString.split(":")
    console.log(splitString)

    if (Array.isArray(splitString) && splitString.length === 2 && splitString[1].length >= 34 && splitString[1].length <= 35) {
      return splitString[1]
    } else {
      return false
    }
  }

  cancelHandler = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  handleVerusQR = (verusQR) => {
    const coinTicker = verusQR.coinTicker
    const address = verusQR.address
    const amount = Number(verusQR.amount)
    const memo = verusQR.memo

    console.log("CoinID: " + coinTicker)
    console.log("Address: " + address)
    console.log("Amount: " + amount)
    console.log("Memo: " + memo)

    if (
      coinTicker && 
      address && 
      amount && 
      address.length >= 34 && 
      address.length <= 35 && 
      amount > 0) {
      if (this.coinExistsInWallet(coinTicker)) {
        let activeCoin = this.getCoinFromActiveCoins(coinTicker)

        if (activeCoin) {
          const spendableBalance = this.props.balances[coinTicker].result.confirmed - activeCoin.fee
          if (this.state.fromHome || this.props.activeCoin.id === coinTicker) {
            if (this.checkBalance(amount, spendableBalance)) {
              this.preConfirm(
                activeCoin, 
                this.props.activeAccount, 
                address,
                amount,
                memo
              )
            }
          } else {
            this.canExitWallet(this.props.activeCoin.id, coinTicker)
            .then((res) => {
              if (res) {
                if (this.checkBalance(amount, spendableBalance)) {
                  this.preConfirm(
                    activeCoin, 
                    this.props.activeAccount, 
                    address,
                    amount,
                    memo
                  )
                }
              } else {
                this.cancelHandler()
              }
            })
          }
        } else {
          this.canAddCoin(coinTicker)
          .then((res) => {
            if (res) {
              this.handleAddCoin(coinTicker)
              .then((res) => {
                if (res) {
                  activeCoin = this.getCoinFromActiveCoins(coinTicker)
  
                  this.handleUpdates()
                  .then(() => {
                    const spendableBalance = this.props.balances[coinTicker].result.confirmed - activeCoin.fee
                    if (this.checkBalance(amount, spendableBalance)) {
                      this.preConfirm(
                        activeCoin, 
                        this.props.activeAccount, 
                        address,
                        amount,
                        memo
                      )
                    }
                  })
                }
              })
            } else {
              this.cancelHandler()
            }
          })      
        }
        
      } else {
        //Handle adding coin that doesn't exist yet in wallet here
        this.errorHandler(INCOMPLETE_VERUS_QR)
      }
    } else {
      this.errorHandler(INCOMPLETE_VERUS_QR)
    }
  }

  handleAddCoin = (coinTicker) => {
    this.setState({ addingCoin: true });
    return new Promise((resolve, reject) => {
      addExistingCoin(coinTicker, this.props.activeCoinList, this.props.activeAccount.id)
      .then(response => {
        if (response) {
          this.props.dispatch(response)
          this.props.dispatch(setUserCoins(this.props.activeCoinList, this.props.activeAccount.id))
          this.props.dispatch(addKeypair(this.props.activeAccount.wifKey, coinTicker, this.props.activeAccount.keys))
          this.props.dispatch(transactionsNeedUpdate(coinTicker, this.props.needsUpdate.transanctions))

          this.props.dispatch(needsUpdate("balances"))
          this.setState({ addingCoin: false });

          resolve(true)
        }
        else {
          throw "Error adding coin"
        }
      })
    })
  }

  preConfirm = (coinObj, activeUser, address, amount, memo) => {
    this.setState({ 
      coinObj: coinObj,
      activeUser: activeUser,
      address: address,
      amount: amount,
      memo: memo 
    }, () => {
      this.handleUpdates()
      .then(() => {
        this.goToConfirmScreen();
      })
    });  
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
          if (this.state.coinObj && this.state.coinObj.id === 'BTC') {
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
            resolve(true)
          } else if (this.state.coinObj && this.state.coinObj.id === 'BTC'){
            this.setState({ 
              btcFeesErr: true,
              loadingBTCFees: false
            });
            resolve(false)
          } else {
            resolve(true)
          }
        })
    }) 
  }

  checkBalance = (amount, spendableBalance) => {
    if (amount > Number(spendableBalance)) {
      this.errorHandler(INSUFFICIENT_FUNDS)
      return false
    } else {
      return true
    }
  }

  canExitWallet = (fromTicker, toTicker) => {
    return AlertAsync(
      'Exiting Wallet',
      'This invoice is requesting funds in ' + toTicker + ', but you are currently ' + 
      'in the ' + fromTicker + ' wallet. Would you like to proceed?',
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  canAddCoin = (coinTicker) => {
    return AlertAsync(
      'Coin Inactive',
      'This invoice is requesting funds in ' + coinTicker + ', but you have not ' +
      'activated that coin yet, would you like to activate ' + coinTicker + ' and proceed?',
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  goToConfirmScreen = () => {
    const route = "ConfirmSend"
    let navigation = this.props.navigation
    let data = {
      coinObj: this.state.coinObj,
      activeUser: this.state.activeUser,
      address: this.state.address,
      amount: Number(this.state.amount),
      btcFee: this.state.btcFees.average,
      balance: this.props.balances[this.state.coinObj.id].result.confirmed,
      memo: this.state.memo
    }

    navigation.navigate(route, {
      data: data
    });
  }

  handleUpdates = () => {
    let promiseArray = []
    
    if(this.props.needsUpdate.balances) {
      console.log("Balances need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }  
      promiseArray.push(updateCoinBalances(
        this.props.balances, 
        this.props.activeCoinsForUser, 
        this.props.activeAccount)
      )
    } 

    if(this.state.coinObj && this.state.coinObj.id === 'BTC' && !this.state.loadingBTCFees) {
      this.setState({ loadingBTCFees: true });  
    }

    return this.updateProps(promiseArray)
  }

  coinExistsInWallet = (coinTicker) => {
    let index = 0;

    while (index < namesList.length && namesList[index] !== coinTicker) {
      index++;
    }

    if (index < namesList.length) {
      return true
    } else {
      return false
    }
  }

  getCoinFromActiveCoins = (coinTicker) => {
    let index = 0;

    while (index < this.props.activeCoinsForUser.length && this.props.activeCoinsForUser[index].id !== coinTicker) {
      index++;
    }

    if (index < namesList.length) {
      return this.props.activeCoinsForUser[index]
    } else {
      return false
    }
  }

  addressOnly = (address) => {
    if (this.props.navigation.state.params && this.props.navigation.state.params.fillAddress) {
      Alert.alert("Address Only", ADDRESS_ONLY);
      this.props.navigation.state.params.fillAddress(address)
      this.props.navigation.dispatch(NavigationActions.back())
    } else {
      this.errorHandler(FORMAT_UNKNOWN)
    }
  }

  QRCodeScanner = () => {
    return {
      
    }
  }

  render() {
    return (
      <View style={styles.root}>
          <QRCodeScanner
            onRead={this.onSuccess.bind(this)}
            showMarker={true}
            captureAudio={false}
          />
        <Spinner
          visible={this.state.loading || this.state.loadingBTCFees || this.state.addingCoin}
          textContent={
            this.state.addingCoin ? 
              "Adding coin..."
              :
              this.state.loadingBTCFees ? 
                "Fetching BTC fees..." 
                : 
                this.state.loading ? 
                  "Loading coin data..."
                  :
                  null
          }
          textStyle={{color: "#FFF"}}
        />
      </View>
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
    activeCoinList: state.coins.activeCoinList,
  }
};

export default connect(mapStateToProps)(VerusPay);


const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  /*centerText: {
    flex: 1,
    fontSize: 18,
    padding: 32,
    color: '#777',
  },
  textBold: {
    fontWeight: '500',
    color: '#000',
  },
  buttonText: {
    fontSize: 21,
    color: 'rgb(0,122,255)',
  },
  buttonTouchable: {
    padding: 16,
  },
  spinnerTextStyle: {
    color: '#FFF'
  },*/
});
