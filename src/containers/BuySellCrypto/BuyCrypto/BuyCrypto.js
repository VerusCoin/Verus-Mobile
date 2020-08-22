/*
  This component is responsible for creating cryptocurrency buy orders,
  and pushing them to the confirmation screen
*/

import React, { Component } from "react"
import StandardButton from "../../../components/StandardButton"
import {
  View,
  ScrollView,
  Keyboard,
  RefreshControl,
  Text,
  TouchableWithoutFeedback,
 } from "react-native"
import { ListItem } from "react-native-elements";
import { NavigationActions } from '@react-navigation/compat';
import Spinner from 'react-native-loading-spinner-overlay';
import { FormLabel, Input, FormValidationMessage, Icon, TouchableOpacity } from 'react-native-elements'
import { connect } from 'react-redux'
import { Dropdown } from 'react-native-material-dropdown'
import { isNumber } from '../../../utils/math';
import { calculatePrice } from '../../../utils/price';
import { SUPPORTED_CRYPTOCURRENCIES, SUPPORTED_FIAT_CURRENCIES, SUPPORTED_PAYMENT_METHODS } from '../../../utils/constants/constants'
import {
  //everythingNeedsUpdate,
  addCoin,
  setUserCoins,
  addKeypairs,
  expireData,
  //transactionsNeedUpdate,
  //updateOneBalance,
  //balancesNeedUpdate
} from '../../../actions/actionCreators'
import { findCoinObj } from '../../../utils/CoinData/CoinData'
import styles from './BuyCrypto.styles'
import DelayedAsyncAlert from '../../../utils/delayedAsyncAlert'
import DelayedAlert from '../../../utils/delayedAlert';
import Colors from '../../../globals/colors';

import {
  BankBuildingBlack, Bank,
} from '../../../images/customIcons';

import {
  getExchangeRates,
} from '../../../actions/actions/PaymentMethod/WyreAccount';

import {
  selectWyreCreatePaymentIsFetching,
  selectExchangeRates,
  selectExchangeRatesIsFetching,
} from '../../../selectors/paymentMethods';
import { selectWyrePaymentMethod } from '../../../selectors/authentication';
import hasPaymentMethod from '../../../utils/paymentMethod';
import { API_GET_FIATPRICE, API_GET_BALANCES, API_GET_INFO, API_GET_TRANSACTIONS, ELECTRUM } from "../../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import store from "../../../store";
import { activateChainLifecycle } from "../../../actions/actions/intervals/dispatchers/lifecycleManager";

class BuyCrypto extends Component {
  constructor(props) {
    super(props);
    const initialToCurr = this.props.activeCoinsForUser.find(coin => {
      return SUPPORTED_CRYPTOCURRENCIES.map(x => x.value).includes(coin.id);
    });
    this.state = {
      fromCurr: SUPPORTED_FIAT_CURRENCIES[0].value,
      toCurr: initialToCurr ? initialToCurr.id : "Select...",
      fromVal: "",
      toVal: "",
      paymentMethod: SUPPORTED_PAYMENT_METHODS[0],
      errors: { fromVal: null, toVal: null },
      loading: false,
      loadingOverlay: false,
      addingCoin: false
    };

    this._unsubscribeFocus = null
  }

  componentDidMount() {
    this.props.getExchangeRates();

    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.props.getExchangeRates();
    });
  }

  componentWillUnmount() {
    this._unsubscribeFocus()
  }

  componentWillReceiveProps(newProps) {
    if (this.props.buy != newProps.buy) {
      this.setState({
        fromCurr: this.state.toCurr,
        toCurr: this.state.fromCurr
      });
    }
  }

  static navigationOptions = ({ route }) => {
    return {
      title:
        typeof route.params === "undefined" ||
        typeof route.params.title === "undefined"
          ? "undefined"
          : route.params.title
    };
  };

  _handleSubmit = () => {
    Keyboard.dismiss();
    if (!hasPaymentMethod(this.props.paymentMethod)) {
      DelayedAlert("Please Manage Account first");
      this.props.navigation.navigate("SelectPaymentMethod", {
        onSelect: this.switchPaymentMethod
      });
    } else {
      this.validateFormData();
    }
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({ errors: _errors });
  };

  forceUpdate = () => {
    const coinObj = this.props.activeCoin
    this.props.dispatch(expireData(coinObj.id, API_GET_FIATPRICE))
    this.props.dispatch(expireData(coinObj.id, API_GET_BALANCES))
    this.props.dispatch(expireData(coinObj.id, API_GET_INFO))
    this.props.dispatch(expireData(coinObj.id, API_GET_TRANSACTIONS))

    this.refresh()
  }

  refresh = () => {
    this.setState({ loading: true }, () => {
      const updates = [API_GET_FIATPRICE]
      Promise.all(updates.map(async (update) => {
        await conditionallyUpdateWallet(store.getState(), this.props.dispatch, this.props.activeCoin.id, update)
      })).then(() => {
        this.setState({ loading: false })
      })
      .catch(error => {
        this.setState({ loading: false })
        console.error(error)
      })
    })
  };

  canAddCoin = coinTicker => {
    return DelayedAsyncAlert(
      "Coin Inactive",
      "In order to buy " +
        coinTicker +
        ", you will need to add it to your wallet. Would you like to do so now?",
      [
        {
          text: "No, take me back",
          onPress: () => Promise.resolve(false),
          style: "cancel"
        },
        { text: "Yes", onPress: () => Promise.resolve(true) }
      ],
      {
        cancelable: false
      }
    );
  };

  setFromVal = value => {
    const converted = calculatePrice(
      value,
      this.state.fromCurr,
      this.state.toCurr,
      this.props.rates
    );

    this.setState({
      fromVal: value,
      toVal: isNumber(converted) ? converted : this.state.toVal
    });
  };

  setToVal = value => {
    const converted = calculatePrice(
      value,
      this.state.fromCurr,
      this.state.toCurr,
      this.props.rates
    );

    this.setState({
      toVal: value,
      fromVal: isNumber(converted) ? converted : this.state.fromVal
    });
  };

  handleAddCoin = coinTicker => {
    this.setState({ addingCoin: true });
    const coinObj = findCoinObj(coinTicker)

    return new Promise((resolve, reject) => {
      addCoin(
        coinObj,
        this.props.activeCoinList,
        this.props.activeAccount.id,
        this.props.coinSettings[coinTicker]
        ? this.props.coinSettings[coinTicker].channels
        : coinObj.compatible_channels
      ).then(response => {
        if (response) {
          this.props.dispatch(response);
          this.props.dispatch(
            setUserCoins(this.props.activeCoinList, this.props.activeAccount.id)
          );
          this.props.dispatch(
            addKeypairs(
              this.props.activeAccount.seeds,
              coinTicker,
              this.props.activeAccount.keys
            )
          );

          activateChainLifecycle(coinTicker)
          this.setState({ addingCoin: false });

          resolve(true);
        } else {
          this.errorHandler("Error adding coin");
        }
      })
      .catch(err => {
        this.setState({ addingCoin: false })
        Alert.alert("Error Adding Coin", err.message)
      })
    });
  };

  switchFromCurr = curr => {
    this.setState({ fromCurr: curr });
  };

  handleUpdates = async () => {
    //DELETE/REFACTOR
    return new Promise((resolve, reject) => {
      let promises = [];
      const finishPromise = () => {
        Promise.all(promises)
          .then(res => {
            resolve(res);
          })
          .catch(err => {
            reject(err);
          });
      };

      this.setState(
        {
          loading: true,
          loadingBTCFees:
            this.state.coinObj &&
            this.state.coinObj.id === "BTC" &&
            !this.state.loadingBTCFees
              ? true
              : false
        },
        () => {
          const updates = [API_GET_BALANCES, API_GET_INFO];
          promises.push(() =>
            Promise.all(
              updates.map(async update => {
                await conditionallyUpdateWallet(
                  store.getState(),
                  this.props.dispatch,
                  this.props.activeCoin.id,
                  update
                );
              })
            )
              .then(() => {
                this.setState({ loading: false });
              })
              .catch(error => {
                this.setState({ loading: false });
                console.error(error);
              })
          );
          finishPromise();
        }
      );
    });
  };

  switchToCurr = coin => {
    const coinIsAlreadyAddedToWallet = this.props.activeCoinsForUser.find(
      coinObj => {
        return SUPPORTED_CRYPTOCURRENCIES.map(x => x.value).includes(
          coinObj.id
        );
      }
    );

    if (this.props.buy && !coinIsAlreadyAddedToWallet) {
      this.canAddCoin(coin).then(res => {
        if (res) {
          this.setState({ loadingOverlay: true, addingCoin: true }, () => {
            this.handleAddCoin(coin).then(res => {
              if (res) {
                this.handleUpdates().then(() => {
                  this.setState({
                    toCurr: coin,
                    loadingOverlay: false,
                    addingCoin: false
                  });
                });
              }
            });
          });
        }
      });
    } else {
      this.setState({ toCurr: coin });
    }
  };

  switchPaymentMethod = method => {
    this.setState({ paymentMethod: method });
  };

  /**
   * Gets price from amount based on rates prop
   * @param {Number} amount Amount to get price for
   * @param {Boolean} fromFiat (Optional, Default = false) Whether to convert from fiat to crypto instead of crypto to fiat
   */

  validateFormData = () => {
    this.setState(
      {
        errors: { fromVal: null, toVal: null }
      },
      () => {
        const _fromVal = this.state.fromVal;
        const _toVal = this.state.toVal;
        const _fromCurr = this.state.fromCurr;
        const _toCurr = this.state.toCurr;
        let _errors = false;

        if (!_fromCurr) {
          Alert.alert("Error", "Please select a currency to pay in");
          _errors = true;
        } else if (!_toCurr) {
          Alert.alert("Error", "Please select a currency to buy");
          _errors = true;
        }

        if (!_fromVal.toString() || _fromVal.toString().length < 1) {
          this.handleError("Required field", "fromVal");
          _errors = true;
        } else if (!isNumber(_fromVal)) {
          this.handleError("Invalid amount", "fromVal");
          _errors = true;
        } else if (Number(_fromVal) <= 0) {
          this.handleError("Enter an amount greater than 0", "fromVal");
          _errors = true;
        } else if (
          !this.props.buy &&
          _fromVal > this.props.balances[_fromCurr].confirmed
        ) {
          this.handleError("You exceeded your balance amount", "fromVal");
          _errors = true;
        }

        if (!_toVal.toString() || _toVal.toString().length < 1) {
          this.handleError("Required field", "toVal");
          _errors = true;
        } else if (!isNumber(_toVal)) {
          this.handleError("Invalid amount", "toVal");
          _errors = true;
        } else if (Number(_toVal) <= 0) {
          this.handleError("Enter an amount greater than 0", "toVal");
          _errors = true;
        }

        if (!_errors && hasPaymentMethod(this.props.paymentMethod)) {
          switch (this.state.paymentMethod.id) {
            case "US_BANK_ACCT":
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
      }
    );
  };

  usBankAcctPayment = (fromVal, fromCurr, toCurr, toVal) => {
    if (global.ENABLE_FIAT_GATEWAY) {
      this.props.navigation.navigate("SendTransaction", {
        paymentMethod: this.state.paymentMethod,
        fromCurr,
        fromVal,
        toCurr,
        toVal
      });
    }
  };

  openPaymentMethodOptions = () => {
    this.props.navigation.navigate("SelectPaymentMethod", {
      onSelect: this.switchPaymentMethod
    });
  };

  onCheatNav = () => {
    this.usBankAcctPayment(
      this.state.fromVal,
      this.state.fromCurr,
      this.state.toCurr,
      this.state.toVal
    );
  }

  onKYCScreen = () => {
    this.props.navigation.navigate("KYCStartScreen");
  }


  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <Spinner
            visible={
              this.state.loadingOverlay ||
              this.state.addingCoin ||
              this.props.inProgress ||
              this.props.exchangeRatesFetching
            }
            textContent={
              this.state.addingCoin ? "Adding coin..." : "Loading..."
            }
            textStyle={{ color: Colors.quaternaryColor }}
            color={Colors.quinaryColor}
          />
          <ScrollView
            contentContainerStyle={{
              height: "100%",
              alignItems: "center",
              justifyContent: "center"
            }}
            refreshControl={
              <RefreshControl
                refreshing={this.state.loading}
                onRefresh={this.forceUpdate}
              />
            }
          >
        </ScrollView>
        <View style={styles.inputAndDropDownContainer}>
          <View style={styles.formInputLabelContainer}>
            <Input
              label={`${this.props.buy ? "Spend:" : "Sell: "} `}
              labelStyle={styles.formLabel}
              underlineColorAndroid="black"
              value={this.state.fromVal}
              inputStyle={styles.formInput}
              containerStyle={styles.formInputContainer}
              keyboardType={"decimal-pad"}
              autoCapitalize="words"
              shake={this.state.errors.fromVal}
              onChangeText={text => this.setFromVal(text)}
            />
          </View>
        </View>
        <View>
          <Dropdown
            rippleOpacity={0}
            rippleDuration={0}
            labelExtractor={item => {
              return item.value;
            }}
            valueExtractor={item => {
              return item.value;
            }}
            data={
              this.props.buy
                ? SUPPORTED_FIAT_CURRENCIES
                : SUPPORTED_CRYPTOCURRENCIES
            }
            onChangeText={value => this.switchFromCurr(value)}
            textColor=""
            selectedItemColor="#232323"
            value={this.state.fromCurr}
            containerStyle={styles.currencyDropDownContainer}
            renderBase={() => {
              return (
                <View style={styles.dropDownBase}>
                  <Text style={styles.currencyLabel}>
                    {this.state.fromCurr}
                  </Text>
                  <Icon
                    size={24}
                    style={styles.dropDownIcon}
                    color="#86939e"
                    name={"arrow-drop-down"}
                  />
                </View>
              );
            }}
            pickerStyle={{ backgroundColor: Colors.tertiaryColor }}
            itemTextStyle={{ fontFamily: "Avenir" }}
          />
        </View>
          <View style={styles.inputAndDropDownContainer}>
            <View style={styles.formInputLabelContainer}>
              <Input
                label="Receive"
                labelStyle={styles.formLabel}
                underlineColorAndroid="black"
                value={this.state.toVal}
                inputStyle={styles.formInput}
                containerStyle={styles.formInputContainer}
                keyboardType={"decimal-pad"}
                autoCapitalize="words"
                shake={this.state.errors.toVal}
                onChangeText={text => this.setToVal(text)}
                editable={false}
              />
            </View>
            <View>
              <Dropdown
                rippleOpacity={0}
                rippleDuration={0}
                labelExtractor={item => {
                  return item.value;
                }}
                valueExtractor={item => {
                  return item.value;
                }}
                data={
                  this.props.buy
                    ? SUPPORTED_CRYPTOCURRENCIES
                    : SUPPORTED_FIAT_CURRENCIES
                }
                onChangeText={value => this.switchToCurr(value)}
                textColor="#E9F1F7"
                selectedItemColor="#232323"
                value={this.state.toCurr}
                containerStyle={styles.currencyDropDownContainer}
                renderBase={() => {
                  return (
                    <View style={styles.dropDownBase}>
                      <Text style={styles.currencyLabel}>
                        {this.state.toCurr}
                      </Text>
                      <Icon
                        size={24}
                        style={styles.dropDownIcon}
                        color="#86939e"
                        name={"arrow-drop-down"}
                      />
                    </View>
                  );

                        }}
                pickerStyle={{ backgroundColor: Colors.tertiaryColor }}
                itemTextStyle={{ fontFamily: "Avenir" }}
              />
            </View>
          </View>
          {ENABLE_WYRE ? (
            <View style={styles.touchableInputBank}>
              <TouchableWithoutFeedback
                onPress={this.openPaymentMethodOptions}
              >
                <View style={styles.formInput}>
                  <ListItem
                    title={
                      <Text style={styles.coinItemLabel}>
                        {this.state.paymentMethod.name}
                      </Text>
                    }
                    avatar={BankBuildingBlack}
                    avatarOverlayContainerStyle={{
                      backgroundColor: "transparent"
                    }}
                    avatarStyle={{ resizeMode: "contain" }}
                    containerStyle={{ borderBottomWidth: 0 }}
                    chevronColor={"black"}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          ) : (
            <View style={styles.inputAndDropDownContainer}>
              <View style={styles.formInput}>
                <Dropdown
                  labelExtractor={item => item.name}
                  valueExtractor={item => item}
                  label="Pay With"
                  labelTextStyle={{
                    fontWeight: "bold",
                    fontFamily: "Avenir"
                  }}
                  labelFontSize={12}
                  data={SUPPORTED_PAYMENT_METHODS}
                  onChangeText={method => this.switchPaymentMethod(method)}
                  textColor="black"
                  selectedItemColor="#232323"
                  baseColor="#86939e"
                  value={this.state.paymentMethod.name}
                  containerStyle={styles.dropDownContainer}
                />
              </View>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <StandardButton
              style={styles.saveChangesButton}
              title="PROCEED"
              onPress={this._handleSubmit}
            />
          <StandardButton
            title="go to kyc screen"
            onPress={this.onKYCScreen}
            />
        </View>
        <View style={styles.buttonContainer}>
          <StandardButton
            style={styles.saveChangesButton}
            title="cheatnav"
            onPress={this.onCheatNav}
          />
      </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

/*
            <View style={styles.valueContainer}>
              <FormValidationMessage>
                {this.state.errors.toVal ? this.state.errors.toVal : null}
              </FormValidationMessage>
            </View>

            {global.ENABLE_FIAT_GATEWAY ? (
              <View style={styles.touchableInputBank}>
                <TouchableWithoutFeedback
                  onPress={this.openPaymentMethodOptions}
                >
                  <View style={styles.formInput}>
                    <ListItem
                      title={
                        <Text style={styles.coinItemLabel}>
                          {this.state.paymentMethod.name}
                        </Text>
                      }
                      avatar={BankBuildingBlack}
                      avatarOverlayContainerStyle={{
                        backgroundColor: "transparent"
                      }}
                      avatarStyle={{ resizeMode: "contain" }}
                      containerStyle={{ borderBottomWidth: 0 }}
                      chevronColor={"black"}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ) : (
              <View style={styles.inputAndDropDownContainer}>
                <View style={styles.formInput}>
                  <Dropdown
                    labelExtractor={item => item.name}
                    valueExtractor={item => item}
                    label="Pay With"
                    labelTextStyle={{
                      fontWeight: "bold",
                      fontFamily: "Avenir"
                    }}
                    labelFontSize={12}
                    data={SUPPORTED_PAYMENT_METHODS}
                    onChangeText={method => this.switchPaymentMethod(method)}
                    textColor="black"
                    selectedItemColor="#232323"
                    baseColor="#86939e"
                    value={this.state.paymentMethod.name}
                    containerStyle={styles.dropDownContainer}
                  />
                </View>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <StandardButton
                style={styles.saveChangesButton}
                title="PROCEED"
                onPress={this._handleSubmit}
              />
            </View>
          </ScrollView>
*/

const mapStateToProps = (state) => ({
  activeCoin: state.coins.activeCoin,
  activeCoinsForUser: state.coins.activeCoinsForUser,
  activeAccount: state.authentication.activeAccount,
  //needsUpdate: state.ledger.needsUpdate,
  activeCoinList: state.coins.activeCoinList,
  inProgress: selectWyreCreatePaymentIsFetching(state),
  rates: selectExchangeRates(state),
  exchangeRatesFetching: selectExchangeRatesIsFetching(state),
  paymentMethod: selectWyrePaymentMethod(state),
  balances: state.ledger.balances[ELECTRUM],
  coinSettings: state.settings.coinSettings
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
  getExchangeRates: () => dispatch(getExchangeRates()),
});

export default connect(mapStateToProps, mapDispatchToProps)(BuyCrypto);
