/*
  This component is responsible for creating cryptocurrency buy orders,
  and pushing them to the confirmation screen
*/

import React, { Component } from "react"
import Button1 from "../../../symbols/button1"
import {
  View,
  ScrollView,
  Keyboard,
  RefreshControl,
  Text,
  TouchableWithoutFeedback,
 } from "react-native"
import { ListItem } from "react-native-elements";
import { NavigationActions } from 'react-navigation';
import Spinner from 'react-native-loading-spinner-overlay';
import { FormLabel, FormInput, FormValidationMessage, Icon, TouchableOpacity } from 'react-native-elements'
import { connect } from 'react-redux'
import { Dropdown } from 'react-native-material-dropdown'
import { isNumber } from '../../../utils/math';
import { calculatePrice } from '../../../utils/price';
import { SUPPORTED_CRYPTOCURRENCIES, SUPPORTED_FIAT_CURRENCIES, SUPPORTED_PAYMENT_METHODS } from '../../../utils/constants'
import {
  setCoinRates,
  everythingNeedsUpdate,
  addExistingCoin,
  setUserCoins,
  addKeypair,
  transactionsNeedUpdate,
  needsUpdate,
  updateCoinBalances
} from '../../../actions/actionCreators'
import { findCoinObj } from '../../../utils/CoinData'
import styles from './BuyCrypto.styles'
import AlertAsync from "react-native-alert-async";

import { ENABLE_WYRE } from '../../../utils/constants'

import {
  BankMain,
} from '../../../images/customIcons';

import {
  getExchangeRates,
} from '../../../actions/actions/PaymentMethod/WyreAccount';

import {
  selectWyreCreatePaymentIsFetching,
  selectExchangeRates,
  selectExchangeRatesIsFetching,
} from '../../../selectors/paymentMethods';

class BuyCrypto extends Component {
  constructor(props) {
    super(props);
    const initialToCurr = this.props.activeCoinsForUser.find(coin => {
      return SUPPORTED_CRYPTOCURRENCIES.map(x => x.value).includes(coin.id);
     })
    this.state = {
      fromCurr: SUPPORTED_FIAT_CURRENCIES[0].value,
      toCurr: initialToCurr ? initialToCurr.id : 'Select...',
      fromVal: '',
      toVal: '',
      paymentMethod: SUPPORTED_PAYMENT_METHODS[0],
      errors: { fromVal: null, toVal: null },
      loading: false,
      loadingOverlay: false,
      addingCoin: false,
    };
  }
  componentDidMount() {
    this.props.getExchangeRates();
  }

  componentWillReceiveProps(newProps) {
    if(this.props.buy != newProps.buy) {
      this.setState({
        fromCurr: this.state.toCurr,
        toCurr: this.state.fromCurr,
      });
    }
  }

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: typeof(navigation.state.params)==='undefined' ||
      typeof(navigation.state.params.title) === 'undefined' ?
      'undefined': navigation.state.params.title,
    };
  };

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  forceUpdate = () => {
    //TODO: Figure out why screen doesnt always update if everything is called seperately

    /*this.props.dispatch(transactionsNeedUpdate(this.props.activeCoin.id, this.props.needsUpdate.transanctions))
    this.props.dispatch(needsUpdate("balances"))
    this.props.dispatch(needsUpdate("rates"))*/
    this.props.dispatch(everythingNeedsUpdate())

    this.refresh()
  }

  refresh = () => {
    const _activeCoinsForUser = this.props.activeCoinsForUser

    let promiseArray = []

    if(this.props.needsUpdate.rates) {
      console.log("Rates need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });
      }
      promiseArray.push(setCoinRates(_activeCoinsForUser))
    }

    this.updateProps(promiseArray)
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
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    })
  }

  canAddCoin = (coinTicker) => {
    return AlertAsync(
      'Coin Inactive',
      'In order to buy ' + coinTicker + ', you will need to add it to your wallet. Would you like to do so now?',
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

  setFromVal = (value) => {
    const converted = calculatePrice(value, this.state.fromCurr, this.state.toCurr, this.props.rates)

    this.setState({fromVal: value, toVal: (isNumber(converted)) ? converted : this.state.toVal})
  }

  setToVal = (value) => {
    const converted = calculatePrice(value, this.state.fromCurr, this.state.toCurr, this.props.rates)

    this.setState({toVal: value, fromVal: (isNumber(converted)) ? converted : this.state.fromVal})
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

  switchFromCurr = (curr) => {
    this.setState({fromCurr: curr})
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

  switchToCurr = (coin) => {
    const coinIsAlreadyAddedToWallet = (this.props.activeCoinsForUser.find(coinObj => {
      return SUPPORTED_CRYPTOCURRENCIES.map(x => x.value).includes(coinObj.id)
      }))
      if (this.props.buy && !coinIsAlreadyAddedToWallet) {
          this.canAddCoin(coin)
          .then((res) => {
            this.setState({loadingOverlay: true, addingCoin: true}, () => {
              if (res) {
                this.handleAddCoin(coin)
                .then((res) => {
                  if (res) {
                    this.handleUpdates()
                    .then(() => {
                      this.setState({toCurr: coin, loadingOverlay: false, addingCoin: false})
                    })
                  }
                })
              }
            })
          })
      } else {
        this.setState({toCurr: coin})
      }
  
  }

  switchPaymentMethod = (method) => {
    this.setState({paymentMethod: method})
  }

  /**
   * Gets price from amount based on rates prop
   * @param {Number} amount Amount to get price for
   * @param {Boolean} fromFiat (Optional, Default = false) Whether to convert from fiat to crypto instead of crypto to fiat
   */

  validateFormData = () => {
    this.setState({
      errors: { fromVal: null, toVal: null },
    }, () => {
      const _fromVal = this.state.fromVal
      const _toVal = this.state.toVal
      const _fromCurr = this.state.fromCurr
      const _toCurr = this.state.toCurr
      let _errors = false;

      if (!_fromCurr) {
        Alert.alert("Error", "Please select a currency to pay in")
        _errors = true
      } else if (!_toCurr) {
        Alert.alert("Error", "Please select a currency to buy")
        _errors = true
      }

      if (!(_fromVal.toString()) || _fromVal.toString().length < 1) {
        this.handleError("Required field", "fromVal")
        _errors = true
      } else if (!(isNumber(_fromVal))) {
        this.handleError("Invalid amount", "fromVal")
        _errors = true
      } else if (Number(_fromVal) <= 0) {
        this.handleError("Enter an amount greater than 0", "fromVal")
        _errors = true
      }

      if (!(_toVal.toString()) || _toVal.toString().length < 1) {
        this.handleError("Required field", "toVal")
        _errors = true
      } else if (!(isNumber(_toVal))) {
        this.handleError("Invalid amount", "toVal")
        _errors = true
      } else if (Number(_toVal) <= 0) {
        this.handleError("Enter an amount greater than 0", "toVal")
        _errors = true
      }

      if (!_errors) {
        switch (this.state.paymentMethod.id) {
          case 'US_BANK_ACCT':
              this.usBankAcctPayment(
                this.state.fromVal,
                this.state.fromCurr,
                this.state.toCurr,
                this.state.toVal
              );
            break;
          default:
        }
      } else {
        return false;
      }
    });
  }

  usBankAcctPayment = (fromVal, fromCurr, toCurr, toVal) => {
    if (ENABLE_WYRE) {
      this.props.navigation.navigate('SendTransaction', {
        paymentMethod: this.state.paymentMethod,
        fromCurr,
        fromVal,
        toCurr,
        toVal,
      });
    }
  }

  openPaymentMethodOptions = () => {
    this.props.navigation.navigate('SelectPaymentMethod', {
      onSelect: this.switchPaymentMethod,
    });
  }
  

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <Spinner
            visible={this.state.loadingOverlay || this.state.addingCoin || this.props.inProgress || this.props.exchangeRatesFetching}
            textContent={
              this.state.addingCoin ?
                "Adding coin..."
                :
                "Loading..."
            }
            textStyle={{color: "#FFF"}}
          />
          <ScrollView
            contentContainerStyle={{height: "100%", alignItems: "center", justifyContent: "center"}}
            refreshControl={
              <RefreshControl
                refreshing={this.state.loading}
                onRefresh={this.forceUpdate}
              />
          }>
          <View style={styles.inputAndDropDownContainer}>
              <View style={styles.formInputLabelContainer}>
                <FormLabel labelStyle={styles.formLabel}>
                  {`${this.props.buy ? 'Buy:' : 'Receive: ' } `}
                </FormLabel>
                <FormInput
                  underlineColorAndroid="#86939d"
                  value={this.state.fromVal}
                  inputStyle={styles.formInput}
                  containerStyle={styles.formInputContainer}
                  keyboardType={"decimal-pad"}
                  autoCapitalize='words'
                  shake={this.state.errors.fromVal}
                  onChangeText={(text) => this.setFromVal(text)}
                />
              </View>
              <View>
                <Dropdown
                  rippleOpacity={0}
                  rippleDuration={0}
                  labelExtractor={(item) => {
                    return item.value
                  }}
                  valueExtractor={(item) => {
                    return item.value
                  }}
                  data={this.props.buy ?  SUPPORTED_FIAT_CURRENCIES : SUPPORTED_CRYPTOCURRENCIES}
                  onChangeText={(value) => this.switchFromCurr(value)}
                  textColor="#E9F1F7"
                  selectedItemColor="#232323"
                  value={this.state.fromCurr}
                  containerStyle={styles.currencyDropDownContainer}
                  renderBase={() => { return(
                    <View style={styles.dropDownBase}>
                      <Text style={styles.currencyLabel}>{this.state.fromCurr}</Text>
                      <Icon size={24} style={styles.dropDownIcon} color="#86939e" name={"arrow-drop-down"} />
                    </View>
                  ) }}
                />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <FormValidationMessage>
              {
                this.state.errors.fromVal ?
                  this.state.errors.fromVal
                  :
                  null
              }
              </FormValidationMessage>
            </View>
            <View style={styles.inputAndDropDownContainer}>
              <View style={styles.formInputLabelContainer}>
                <FormLabel labelStyle={styles.formLabel}>
                  {`${this.props.buy ? 'Receive:' : 'Sell:' } `}
                </FormLabel>
                <FormInput
                  underlineColorAndroid="#86939d"
                  value={this.state.toVal}
                  inputStyle={styles.formInput}
                  containerStyle={styles.formInputContainer}
                  keyboardType={"decimal-pad"}
                  autoCapitalize='words'
                  shake={this.state.errors.toVal}
                  onChangeText={(text) => this.setToVal(text)}
                  editable={false}
                />
              </View>
              <View>
                <Dropdown
                  rippleOpacity={0}
                  rippleDuration={0}
                  labelExtractor={(item) => {
                    return item.value;
                  }}
                  valueExtractor={(item) => {
                    return item.value;
                  }}
                  data={this.props.buy ? SUPPORTED_CRYPTOCURRENCIES : SUPPORTED_FIAT_CURRENCIES }
                  onChangeText={(value) => this.switchToCurr(value)}
                  textColor="#E9F1F7"
                  selectedItemColor="#232323"
                  value={this.state.toCurr}
                  containerStyle={styles.currencyDropDownContainer}
                  renderBase={() => { return(
                    <View style={styles.dropDownBase}>
                      <Text style={styles.currencyLabel}>{this.state.toCurr}</Text>
                      <Icon size={24} style={styles.dropDownIcon} color="#86939e" name={"arrow-drop-down"} />
                    </View>
                  ) }}
                />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <FormValidationMessage>
              {
                this.state.errors.toVal ?
                  this.state.errors.toVal
                  :
                  null
              }
              </FormValidationMessage>
            </View>

            {ENABLE_WYRE ? (
              <View style={styles.touchableInputBank}>
                <TouchableWithoutFeedback onPress={this.openPaymentMethodOptions}>
                  <View style={styles.formInput}>
                    <ListItem
                      roundAvatar
                      title={(
                        <Text style={styles.coinItemLabel}>
                          {this.state.paymentMethod.name}
                        </Text>
                      )}
                      avatar={BankMain}
                      containerStyle={{ borderBottomWidth: 0 }}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ) : (
              <View style={styles.inputAndDropDownContainer}>
                <View style={styles.formInput}>
                  <Dropdown
                    labelExtractor={(item) => item.name}
                    valueExtractor={(item) => item}
                    label="Pay With"
                    labelTextStyle={{ fontWeight: 'bold' }}
                    labelFontSize={12}
                    data={SUPPORTED_PAYMENT_METHODS}
                    onChangeText={(method) => this.switchPaymentMethod(method)}
                    textColor="#86939e"
                    selectedItemColor="#232323"
                    baseColor="#86939e"
                    value={this.state.paymentMethod.name}
                    containerStyle={styles.dropDownContainer}
                  />
                </View>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <Button1
                style={styles.backButton}
                buttonContent="Back"
                onPress={this.back}
              />
              <Button1
                style={styles.saveChangesButton}
                buttonContent="Proceed"
                onPress={this._handleSubmit}
              />
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  activeCoin: state.coins.activeCoin,
  activeCoinsForUser: state.coins.activeCoinsForUser,
  activeAccount: state.authentication.activeAccount,
  needsUpdate: state.ledger.needsUpdate,
  activeCoinList: state.coins.activeCoinList,
  inProgress: selectWyreCreatePaymentIsFetching(state),
  rates: selectExchangeRates(state),
  exchangeRatesFetching: selectExchangeRatesIsFetching(state)
});

const mapDispatchToProps = ({
  getExchangeRates,
});

export default connect(mapStateToProps, mapDispatchToProps)(BuyCrypto);
