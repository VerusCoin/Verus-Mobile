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
import {
  View,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView
} from "react-native"
import { isNumber, truncateDecimal } from '../../../utils/math'
import { connect } from "react-redux";
import { getRecommendedBTCFees } from '../../../utils/api/channels/general/callCreators'
import Styles from '../../../styles/index'
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers"
import store from "../../../store"
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_KEYS,
  API_SEND,
  API_GET_INFO,
  GENERAL,
  DLIGHT_PRIVATE,
} from "../../../utils/constants/intervalConstants";
import BigNumber from "bignumber.js"
import Colors from "../../../globals/colors"
import { UtilityContracts } from "../../../utils/api/channels/erc20/callCreator"
import { ethers } from "ethers"
import RFoxClaim from "../../../components/RFoxClaim"
import { Portal, TextInput, Button, Text } from "react-native-paper"
import { DISABLE_CLAIM_BUTTON } from "../../../utils/constants/storeType"
import NumberPadModal from "../../../components/NumberPadModal/NumberPadModal"
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert"
import TextInputModal from "../../../components/TextInputModal/TextInputModal"
import { USD } from "../../../utils/constants/currencies";

class SendCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      coin: { name: "" },
      balances: {},
      account: "none",
      fromAddress: "",
      toAddress: "",
      memo: "",
      amount: 0,
      amountFiat: false,
      btcFees: {},
      loadingBTCFees: false,
      loading: false,
      btcFeesErr: false,
      activeCoinsForUser: {},
      formErrors: { toAddress: null, amount: null },
      spendableBalance: 0,
      addressCheckEnabled: true,
      addressCheckSecretCounter: 0,
      rewards: ethers.BigNumber.from(0),
      rewardModalOpen: false,
      amountModalOpen: false,
      addressModalOpen: false,
      memoModalOpen: false,
      pubKey: null,
    };

    this.ADDR_CHECK_SECRET_COUNTER_TRIGGER = 10;
    this._unsubscribeFocus = null;
    this.ZERO = ethers.BigNumber.from(0);
  }

  componentDidMount() {
    this.initializeState();

    this._unsubscribeFocus = this.props.navigation.addListener("focus", () => {
      this.initializeState();
    });
  }

  componentWillUnmount() {
    this._unsubscribeFocus();
  }

  componentDidUpdate(lastProps, lastState) {
    if (
      lastState.rewardModalOpen !== this.state.rewardModalOpen &&
      this.state.rewardModalOpen === false
    ) {
      this.initializeState();
    }
  }

  initializeState = () => {
    this.setState(
      {
        coin: this.props.activeCoin,
        account: this.props.activeAccount,
        activeCoinsForUser: this.props.activeCoinsForUser,
        toAddress:
          this.state.toAddress && this.state.toAddress.length > 0
            ? this.state.toAddress
            : this.props.data
            ? this.props.data.address
            : null,
      },
      () => {
        const activeUser = this.state.account;
        const coinObj = this.state.coin;

        this.handleState(activeUser, coinObj);
      }
    );
  };

  checkRfoxClaims = async (pubKey) => {
    const balances = await UtilityContracts.rfox.getRfoxAccountBalances(pubKey);

    this.setState({
      rewards: balances.available,
      pubKey,
    });
  };

  handleState = async (activeUser, coinObj) => {
    const { key_channel } = this.props;

    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][key_channel] != null &&
      activeUser.keys[coinObj.id][key_channel].addresses.length > 0
    ) {
      this.setState({
        fromAddress: activeUser.keys[coinObj.id][key_channel].addresses[0],
      });
    } else {
      throw new Error(
        "SendCoin.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin not found!"
      );
    }

    this.setState(
      { loading: true, loadingBTCFees: coinObj.id === "BTC" },
      async () => {
        await conditionallyUpdateWallet(
          store.getState(),
          this.props.dispatch,
          coinObj.id,
          API_GET_FIATPRICE
        );
        await conditionallyUpdateWallet(
          store.getState(),
          this.props.dispatch,
          coinObj.id,
          API_GET_BALANCES
        );
        if (coinObj.id === "BTC") {
          await this.updateBtcFees();
        }

        if (
          coinObj.id === "RFOX" &&
          activeUser.keys[coinObj.id] != null &&
          activeUser.keys[coinObj.id][key_channel] != null
        ) {
          await this.checkRfoxClaims(
            activeUser.keys[coinObj.id][key_channel].pubKey
          );
        }

        this.setState({ loading: false });
      }
    );
  };

  handleFormError = (error, field) => {
    let _errors = this.state.formErrors;
    _errors[field] = error;

    this.setState({ formErrors: _errors });
  };

  updateBtcFees = () => {
    return new Promise((resolve, reject) => {
      getRecommendedBTCFees().then((res) => {
        if (res) {
          this.setState(
            {
              btcFees: res,
              loadingBTCFees: false,
            },
            resolve
          );
        } else {
          this.setState(
            {
              btcFeesErr: true,
              loadingBTCFees: false,
            },
            resolve
          );
        }
      });
    });
  };

  maxAmount = () => {
    const { balances } = this.props;

    this.fillAmount(BigNumber(balances.results.confirmed));
  };

  goToConfirmScreen = (coinObj, activeUser, address, amount) => {
    const route = "ConfirmSend";
    let navigation = this.props.navigation;

    let data = {
      coinObj: coinObj,
      activeUser: activeUser,
      address: address,
      amount: Number(amount),
      btcFee: this.state.btcFees.average,
      balance: this.props.balances.results.confirmed,
      channel: this.props.send_channel,
      memo:
        this.props.subWalletId === "PRIVATE_WALLET" &&
        this.isPrivateSend()
          ? this.state.memo
          : null,
    };

    navigation.navigate(route, {
      data: data,
    });
  };

  fillAddress = (address) => {
    this.setState({ toAddress: address });
  };

  fillAmount = (amount) => {
    let cryptoAmount = BigNumber(this.translateAmount(amount));
    if (cryptoAmount.isLessThan(BigNumber(0))) {
      cryptoAmount = BigNumber(0);
    }

    this.setState({
      amount: this.state.amountFiat
        ? truncateDecimal(cryptoAmount, 2)
        : cryptoAmount.toString(),
    });
  };

  _verusPay = () => {
    let navigation = this.props.navigation;

    navigation.navigate("VerusPay", {
      fillAddress: this.fillAddress,
      fillAmount: this.fillAmount,
      channel: this.props.send_channel
    });
  };

  incrementSecretCounter = () => {
    this.setState(
      {
        addressCheckSecretCounter: this.state.addressCheckSecretCounter + 1,
      },
      () => {
        if (
          this.state.addressCheckSecretCounter >=
          this.ADDR_CHECK_SECRET_COUNTER_TRIGGER
        ) {
          Alert.alert("Info", "Simple address validation disabled.");
          this.setState({
            addressCheckEnabled: false,
          });
        }
      }
    );
  };

  getPrivKey = () => {
    const { activeAccount, activeCoin, balance_channel } = this.props;

    if (
      activeAccount != null &&
      activeAccount.keys[activeCoin.id] != null &&
      activeAccount.keys[activeCoin.id][balance_channel] != null
    ) {
      return activeAccount.keys[activeCoin.id][balance_channel].privKey;
    } else return null;
  };

  translateAmount = (amount, fromFiat = false) => {
    let _price =
      this.props.rates[this.props.activeCoin.id] != null
        ? this.props.rates[this.props.activeCoin.id][
            this.props.displayCurrency
          ]
        : null;
    
    return _price == null
      ? fromFiat
        ? "0"
        : amount
      : this.state.amountFiat
      ? fromFiat
        ? BigNumber(amount)
            .dividedBy(BigNumber(_price))
            .toString()
        : BigNumber(amount)
            .multipliedBy(BigNumber(_price))
            .toString()
      : amount.toString();
  }

  //TODO: Add fee to Bitcoin object in CoinData

  validateFormData = () => {
    this.setState(
      {
        formErrors: { toAddress: null, amount: null },
      },
      () => {
        const coin = this.state.coin;

        const spendableBalance = this.props.balances.results.confirmed;

        const toAddress =
          this.state.toAddress != null
            ? this.state.toAddress.trim()
            : "";
        const fromAddress = this.state.fromAddress;
        const amount =
          (this.state.amount.toString().includes(".") &&
            this.state.amount.toString().includes(",")) ||
          !this.state.amount
            ? this.state.amount
            : this.state.amount.toString().replace(/,/g, ".");
        const account = this.state.account;
        let translatedAmount;
        let _errors = false;

        if (!toAddress || toAddress.length < 1) {
          this.handleFormError("Required field", "toAddress");
          createAlert("Required Field", "Address is a required field.")
          _errors = true;
        }
        // } else if (
        //   this.state.addressCheckEnabled &&
        //   !((new RegExp(this.props.addressFormat)).test(toAddress))
        // ) {
        //   this.handleFormError("Invalid address", "toAddress");
        //   createAlert(
        //     "Invalid Address",
        //     `Please enter a valid address.`
        //   );
        //   _errors = true;
        // }

        if (!amount.toString()) {
          this.handleFormError("Required field", "amount");
          createAlert("Required Field", "Amount is a required field.");
          _errors = true;
        } else if (!isNumber(amount)) {
          this.handleFormError("Invalid amount", "amount");
          createAlert(
            "Invalid Amount",
            "Please enter a valid number amount."
          );
          _errors = true;
        } else {
          translatedAmount = this.translateAmount(amount, this.state.amountFiat)

          if (
            Number(translatedAmount) > Number(spendableBalance)
          ) {
            const message =
              "Insufficient funds, " +
              (spendableBalance < 0
                ? "available amount is less than fee"
                : spendableBalance +
                  " confirmed " +
                  coin.id +
                  " available." +
                  (this.props.balance_channel === DLIGHT_PRIVATE
                    ? "\n\nFunds from private transactions require 10 confirmations (~10 minutes) before they can be spent."
                    : ""));
  
            this.handleFormError(message, "amount");
            createAlert("Insufficient Funds", message);
            _errors = true;
          }
        }
        
        if (!coin) {
          createAlert("No active coin", "No current active coin.");
          _errors = true;
        }

        if (!account) {
          createAlert("No active account", "No current active account.");
          _errors = true;
        }

        if (!fromAddress) {
          createAlert("No from address", "No current active from address.");
          _errors = true;
        }

        if (!_errors) {
          this.goToConfirmScreen(coin, account, toAddress, translatedAmount);
        }
      }
    );
  };

  claimSuccess() {
    this.props.dispatch({
      type: DISABLE_CLAIM_BUTTON,
    });

    this.setState(
      {
        rewardModalOpen: false,
      },
      () => {
        Alert.alert(
          "Success!",
          "RFOX claimed, it may take a few minutes to show in your wallet."
        );
      }
    );
  }

  isPrivateSend() {
    return (
      this.state.toAddress != null &&
      (this.state.toAddress[0] === "z" ||
        this.state.toAddress.includes(":private"))
    );
  }

  getPrice = () => {
    const { state, props } = this
    const { amount, amountFiat } = state
    const { rates, displayCurrency, activeCoin } = props

    let _price = rates[activeCoin.id] != null ? rates[activeCoin.id][displayCurrency] : null
    
    if (!(amount.toString()) ||
      !(isNumber(amount)) ||
      !_price) {
      return 0
    } 

    if (amountFiat) {
      return truncateDecimal(amount/_price, 5)
    } else {
      return truncateDecimal(amount*_price, 2)
    }
  }

  render() {
    const {
      balances,
      claimDisabled,
      rates,
      activeCoin,
      displayCurrency,
    } = this.props;
    const { amountFiat } = this.state
    const hasRewards = this.state.rewards.gt(this.ZERO)
    const privKey = this.getPrivKey();
    const _price = this.getPrice();
    const fiatEnabled =
      rates[activeCoin.id] && rates[activeCoin.id][displayCurrency] != null;

    return (
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <View style={Styles.defaultRoot}>
          <ScrollView
            style={Styles.fullWidth}
            contentContainerStyle={Styles.horizontalCenterContainer}
          >
            <Portal>
              {this.state.rewardModalOpen && (
                <RFoxClaim
                  animationType="slide"
                  rewards={this.state.rewards}
                  pubKey={this.state.pubKey}
                  fromAddress={this.state.fromAddress}
                  privKey={privKey}
                  transparent={false}
                  visible={this.state.rewardModalOpen}
                  onSuccess={() => this.claimSuccess()}
                  cancel={() => {
                    this.setState({ rewardModalOpen: false });
                  }}
                />
              )}
              {this.state.amountModalOpen && (
                <NumberPadModal
                  value={Number(this.state.amount)}
                  visible={this.state.amountModalOpen}
                  onChange={(number) =>
                    this.setState({ amount: number.toString() })
                  }
                  cancel={() => {
                    this.setState({ amountModalOpen: false });
                  }}
                  decimals={this.props.activeCoin.decimals}
                />
              )}
              {this.state.addressModalOpen && (
                <TextInputModal
                  value={this.state.toAddress}
                  visible={this.state.addressModalOpen}
                  onChange={(text) => {
                    if (text != null)
                      this.setState({ toAddress: text });
                  }}
                  cancel={() => {
                    this.setState({ addressModalOpen: false });
                  }}
                />
              )}
              {this.state.memoModalOpen && (
                <TextInputModal
                  value={this.state.memo}
                  visible={this.state.memoModalOpen}
                  onChange={(text) => {
                    if (text != null) this.setState({ memo: text });
                  }}
                  cancel={() => {
                    this.setState({ memoModalOpen: false });
                  }}
                />
              )}
            </Portal>
            <View style={Styles.wideBlock}>
              <View style={Styles.flexRow}>
                <TouchableOpacity
                  onPress={() => this.setState({ amountModalOpen: true })}
                  style={{ ...Styles.flex }}
                >
                  <TextInput
                    label={`Amount${
                      fiatEnabled && _price != 0
                        ? ` (~${_price} ${
                            amountFiat ? activeCoin.id : displayCurrency
                          })`
                        : ""
                    }`}
                    dense
                    value={this.state.amount}
                    editable={false}
                    pointerEvents="none"
                    style={{
                      backgroundColor: Colors.secondaryColor,
                    }}
                    error={this.state.formErrors.amount}
                  />
                </TouchableOpacity>
                <Button
                  onPress={() =>
                    this.setState({
                      amountFiat: !amountFiat,
                    })
                  }
                  color={Colors.primaryColor}
                  disabled={!fiatEnabled || balances.results == null}
                  style={{
                    alignSelf: "center",
                    marginTop: 6,
                  }}
                  compact
                >
                  {amountFiat ? displayCurrency : activeCoin.id}
                </Button>
                <Button
                  onPress={this.maxAmount}
                  color={Colors.primaryColor}
                  style={{
                    alignSelf: "center",
                    marginTop: 6,
                    marginLeft: 8,
                  }}
                  disabled={balances.results == null}
                  compact
                >
                  {"Max"}
                </Button>
              </View>
            </View>
            <View style={Styles.wideBlock}>
              <View style={Styles.flexRow}>
                <TouchableOpacity
                  onPress={() => this.setState({ addressModalOpen: true })}
                  style={{ ...Styles.flex }}
                >
                  <TextInput
                    label="Address"
                    dense
                    value={this.state.toAddress}
                    multiline
                    editable={false}
                    pointerEvents="none"
                    style={{
                      backgroundColor: Colors.secondaryColor,
                    }}
                    error={this.state.formErrors.toAddress}
                  />
                </TouchableOpacity>
                <Button
                  onPress={this._verusPay}
                  color={Colors.primaryColor}
                  disabled={balances.results == null}
                  style={{
                    alignSelf: "center",
                    marginTop: 6,
                    marginLeft: 8,
                  }}
                  compact
                >
                  {"Scan"}
                </Button>
              </View>
            </View>
            {this.props.subWalletId === "PRIVATE_WALLET" &&
              this.isPrivateSend() && (
                <View style={Styles.wideBlock}>
                  <View style={Styles.flexRow}>
                    <TouchableOpacity
                      onPress={() => this.setState({ memoModalOpen: true })}
                      style={{ ...Styles.flex }}
                    >
                      <TextInput
                        label="Message"
                        dense
                        multiline
                        value={this.state.memo}
                        editable={false}
                        pointerEvents="none"
                        style={{
                          backgroundColor: Colors.secondaryColor,
                        }}
                        error={this.state.formErrors.memo}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            <View
              style={
                hasRewards
                  ? Styles.standardWidthSpaceBetweenBlock
                  : Styles.fullWidthFlexCenterBlock
              }
            >
              {hasRewards &&
              !this.state.loading &&
              !this.state.loadingBTCFees ? (
                <Button
                  onPress={() =>
                    this.setState({
                      rewardModalOpen: true,
                    })
                  }
                  color={Colors.successButtonColor}
                  disabled={claimDisabled}
                >
                  {"Claim"}
                </Button>
              ) : null}
              <Button
                onPress={this.validateFormData}
                color={Colors.primaryColor}
                loading={
                  this.state.loading ||
                  this.state.loadingBTCFees ||
                  this.props.syncing
                }
                disabled={
                  this.state.loading ||
                  this.state.loadingBTCFees ||
                  balances.errors ||
                  this.state.btcFeesErr ||
                  this.props.syncing ||
                  balances.results == null
                }
              >
                {this.state.btcFeesErr
                  ? "Fee Error"
                  : balances.errors
                  ? "Connection Error"
                  : this.state.loading
                  ? "Updating balance..."
                  : this.state.loadingBTCFees
                  ? "Loading fees..."
                  : this.props.syncing
                  ? "Syncing..."
                  : "Send"}
              </Button>
            </View>
            <View style={Styles.fullWidth}>
              <TouchableWithoutFeedback
                onPress={this.incrementSecretCounter}
              >
                <View
                  style={{
                    ...Styles.fullWidth,
                    height: 40,
                    backgroundColor: Colors.secondaryColor,
                  }}
                />
              </TouchableWithoutFeedback>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const balance_channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_BALANCES]
  const key_channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_KEYS]
  const send_channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_SEND]
  const info_channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_INFO]
 
  return {
    balance_channel,
    key_channel,
    send_channel,
    subWalletId: state.coinMenus.activeSubWallets[chainTicker].id,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoin: state.coins.activeCoin,
    balances: {
      results: state.ledger.balances[balance_channel][chainTicker],
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    activeAccount: state.authentication.activeAccount,
    claimDisabled: state.coinMenus.claimDisabled,
    syncing:
      state.ledger.info[info_channel][chainTicker] != null &&
      state.ledger.info[info_channel][chainTicker].percent != 100,
    rates: state.ledger.rates[GENERAL],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(SendCoin);