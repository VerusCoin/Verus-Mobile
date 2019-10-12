/*
  This component handles VerusPay, the Verus Mobile one step
  payment solution. It should be as general as possible, and 
  able to handle as many different kinds of payment protocols
  as possible while still looking and feeling the same from the
  user side of things.
*/

import React, { Component } from "react";
import {
  View,
  Alert
} from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import { isJson } from '../../utils/objectManip'
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { namesList, coinsList, findCoinObj } from '../../utils/CoinData'
import { getRecommendedBTCFees } from '../../utils/httpCalls/callCreators'
import { removeSpaces } from '../../utils/stringUtils'
import {
  updateCoinBalances,
  setUserCoins,
  addKeypair,
  transactionsNeedUpdate,
  needsUpdate,
  addExistingCoin,
  setActiveApp,
  setActiveCoin,
  setActiveSection
 } from '../../actions/actionCreators'
import Spinner from 'react-native-loading-spinner-overlay';
import AlertAsync from "react-native-alert-async";
import { coinsToSats } from '../../utils/math'
import {
  FORMAT_UNKNOWN,
  ADDRESS_ONLY,
  INCOMPATIBLE_APP,
  INCOMPATIBLE_COIN,
  INSUFFICIENT_FUNDS,
  INCOMPLETE_VERUS_QR,
  ONLY_ADDRESS,
  BALANCE_NULL
} from '../../utils/constants'
import styles from './VerusPay.styles'

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

  resetToScreen = (route, title, data) => {
    const resetAction = NavigationActions.reset({
      index: 1, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: "Home" }),
        NavigationActions.navigate({ routeName: route, params: {title: title, data: data} }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

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
      if (typeof result === "string") {
        let coinURLParsed = this.parseCoinURL(result)

        if (coinURLParsed) {
          this.handleVerusQR(coinURLParsed)
        } else if (result.length >= 34 && result.length <= 35) {
          this.addressOnly(result)
        } else {
          this.errorHandler(FORMAT_UNKNOWN)
        }
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
  isCoinURL = (qrString) => {
    let splitString = qrString.split(":")

    if (Array.isArray(splitString) && splitString.length === 2 && splitString[1].length >= 34 && splitString[1].length <= 35) {
      return splitString[1]
    } else {
      return false
    }
  }

  parseCoinURL = (qrString) => {
    let fullURL = /^\w{1,30}:\w{33,36}\?amount\=\d*\.{1}\d*/
    //<coinName>:<address>?amount=<amount>
    let partialURL = /^\w{1,30}:\w{33,36}$/
    //<coinName>:<address>

    let firstTry = qrString.match(fullURL) 

    if(firstTry) {
      //parse full URL here
      let coinName = firstTry[0].substring(0, firstTry[0].indexOf(':'))
      let address = firstTry[0].substring((firstTry[0].indexOf(':') + 1), firstTry[0].indexOf('?'))
      let amount = firstTry[0].substring((firstTry[0].indexOf('=') + 1))

      if (coinName && address && amount) {
        //Find coin ticker from coin data here, URL uses full name

        for (key in coinsList) {
          if (coinsList[key] && removeSpaces(coinsList[key].name).toLowerCase() === coinName.toLowerCase()) {
            //Create verusQR compatible data from coin URL
            return {
              coinTicker: coinsList[key].id,
              address: address,
              amount: coinsToSats(Number(amount))
            }
          } 
        }

        this.errorHandler(INCOMPATIBLE_COIN)
        return false
      }
    } else {
      let secondTry = qrString.match(partialURL) 

      if (secondTry) {
        //Parse partial URL here
        let coinName = secondTry[0].substring(0, secondTry[0].indexOf(':'))
        let address = secondTry[0].substring((secondTry[0].indexOf(':') + 1))

        for (coinObj in coinsList) {
          if (removeSpaces(coinObj.name).toLowerCase() === coinName.toLowerCase()) {
            //Create verusQR compatible data from coin URL
            return {
              coinTicker: coinObj.id,
              address: address,
            }
          } 
        }

        this.errorHandler(INCOMPATIBLE_COIN)
        return false
      } else {
        return false 
      }
    } 
  }

  cancelHandler = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  handleVerusQR = (verusQR) => {
    const coinTicker = verusQR.coinTicker
    const address = verusQR.address
    const amount = verusQR.hasOwnProperty('amount') ? Number(verusQR.amount) : null
    const memo = verusQR.memo


    if (__DEV__) {
      console.log("CoinID: " + coinTicker)
      console.log("Address: " + address)
      if (amount === null || amount <= 0) {
        console.log("Invalid amount, need additional information for transaction")
      } else {
        console.log("Amount: " + amount)
      }
      console.log("Memo: " + memo)
    }
    

    if (
      coinTicker && 
      address && 
      address.length >= 34 && 
      address.length <= 35) {
      if (this.coinExistsInWallet(coinTicker)) {
        let activeCoin = this.getCoinFromActiveCoins(coinTicker)

        if (activeCoin) {
          if (this.state.fromHome || this.props.activeCoin.id === coinTicker) {
            if (amount === null || amount <= 0) {
              this.handleMissingAmount(activeCoin, address, memo)
            } else {
              if (this.checkBalance(amount, activeCoin)) {
                this.preConfirm(
                  activeCoin,
                  this.props.activeAccount, 
                  address,
                  amount,
                  memo
                )
              }
            }
          } else {
            this.canExitWallet(this.props.activeCoin.id, coinTicker)
            .then((res) => { 
              if (res) {
                if (amount === null || amount <= 0) {
                  this.handleMissingAmount(activeCoin, address, memo)
                } else {
                  if (this.checkBalance(amount, activeCoin)) {
                    this.preConfirm(
                      activeCoin,
                      this.props.activeAccount, 
                      address,
                      amount,
                      memo
                    )
                  }
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
                    if (amount === null || amount <= 0) {
                      this.handleMissingAmount(activeCoin, address, memo)
                    } else {
                      if (this.checkBalance(amount, activeCoin)) {
                        this.preConfirm(
                          activeCoin, 
                          this.props.activeAccount, 
                          address,
                          amount,
                          memo
                        )
                      }
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
        //TODO: Handle adding coin that doesn't exist yet in wallet here
        this.errorHandler(INCOMPLETE_VERUS_QR)
      }
    } else {
      this.errorHandler(INCOMPLETE_VERUS_QR)
    }
  }

  handleAddCoin = (coinTicker) => {
    this.setState({ addingCoin: true });
    return new Promise((resolve, reject) => {
      addExistingCoin(findCoinObj(coinTicker), this.props.activeCoinList, this.props.activeAccount.id)
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
          this.errorHandler("Error adding coin")
        }
      })
    })
  }

  handleMissingAmount = (coinObj, address, memo) => {
    this.canFillAmount(memo, address)
    .then((res) => {
      if (res) {
        if (coinObj.apps.hasOwnProperty('wallet')) {
          let wallet = coinObj.apps.wallet
          let sendIndex = wallet.data.findIndex(section => section.key === 'wallet-send')
            
          if (sendIndex >= 0) { 
            this.props.dispatch(setActiveCoin(coinObj))
            this.props.dispatch(setActiveApp('wallet'))
            this.props.dispatch(setActiveSection(wallet.data[sendIndex]))
            this.resetToScreen("CoinMenus", 'Send', {address: address}) 
          } else {
            this.errorHandler(INCOMPATIBLE_APP)
          }
        } else {
          this.errorHandler(INCOMPATIBLE_APP)
        }
      } else {
        this.cancelHandler()
      }
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
        .then(() => {
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

  checkBalance = (amount, activeCoin) => {
    if (activeCoin && this.props.balances[activeCoin.id] && this.props.balances[activeCoin.id].result) {
      const spendableBalance = this.props.balances[activeCoin.id].result.confirmed - activeCoin.fee

      if (amount > Number(spendableBalance)) {
        this.errorHandler(INSUFFICIENT_FUNDS)
        return false
      } else {
        return true
      }
    } else {
      this.errorHandler(BALANCE_NULL)
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

  canFillAmount = (memo, address) => {
    return AlertAsync(
      'Missing Amount',
      'This invoice does not specify an amount, in order to proceed you ' + 
      'will need to fill in the amount yourself, would you like to continue?' +
      '\n\n To: ' + address + (memo ? ('\n\n Memo: ' + memo) : null),
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

    let data = {
      coinObj: this.state.coinObj,
      activeUser: this.state.activeUser,
      address: this.state.address,
      amount: Number(this.state.amount),
      btcFee: this.state.btcFees.average,
      balance: this.props.balances[this.state.coinObj.id].result.confirmed,
      memo: this.state.memo
    }

    this.resetToScreen(route, "Confirm", data)
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
      this.errorHandler(ONLY_ADDRESS)
    }
  }

  render() {
    return (
      <View style={styles.root}>
        <QRCodeScanner
          onRead={this.onSuccess.bind(this)}
          showMarker={true}
          captureAudio={false}
          cameraStyle={styles.QRCamera}
        />
        <Spinner
          visible={this.state.loading || this.state.loadingBTCFees || this.state.addingCoin || this.state.spinnerOverlay}
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
