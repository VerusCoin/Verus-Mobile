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
import StandardButton from "../../../components/StandardButton"
import { FormLabel, Input, FormValidationMessage } from "react-native-elements"
import {
  View,
  Text,
  Alert,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView
} from "react-native"
import { isNumber } from '../../../utils/math'
import { connect } from "react-redux";
import { getRecommendedBTCFees } from '../../../utils/api/channels/general/callCreators'
import { removeSpaces } from '../../../utils/stringUtils'
import Styles from '../../../styles/index'
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers"
import store from "../../../store"
import { API_GET_FIATPRICE, API_GET_BALANCES } from "../../../utils/constants/intervalConstants"
import BigNumber from "bignumber.js"
import { VerusPayLogo } from "../../../images/customIcons"
import Colors from "../../../globals/colors"
import { UtilityContracts } from "../../../utils/api/channels/erc20/callCreator"
import { ethers } from "ethers"
import { stubFalse } from "lodash"
import RFoxClaim from "../../../components/RFoxClaim"
import { Portal } from "react-native-paper"
import { DISABLE_CLAIM_BUTTON } from "../../../utils/constants/storeType"

class SendCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      coin: { name: "" },
      balances: {},
      account: "none",
      fromAddress: "",
      toAddress: "",
      amount: 0,
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
      pubKey: null
    };

    this.ADDR_CHECK_SECRET_COUNTER_TRIGGER = 10
    this._unsubscribeFocus = null;
    this.ZERO = ethers.BigNumber.from(0)
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
    if (lastState.rewardModalOpen !== this.state.rewardModalOpen && this.state.rewardModalOpen === false) {
      this.initializeState()
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
    const balances = await UtilityContracts.rfox.getRfoxAccountBalances(pubKey)

    this.setState({
      rewards: balances.available,
      pubKey
    })
  }

  handleState = async (activeUser, coinObj) => {
    const { channel } = this.props;

    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][channel] != null &&
      activeUser.keys[coinObj.id][channel].addresses.length > 0
    ) {
      this.setState({
        fromAddress: activeUser.keys[coinObj.id][channel].addresses[0],
      });
    } else {
      throw new Error(
        "SendCoin.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin " +
          coinObj[i].id +
          " not found!"
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
          activeUser.keys[coinObj.id][channel] != null
        ) {
          await this.checkRfoxClaims(activeUser.keys[coinObj.id][channel].pubKey);
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
          console.log("BTC FEES:");
          console.log(res);
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
    const { balances } = this.props
    
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
    };

    navigation.navigate(route, {
      data: data,
    });
  };

  fillAddress = (address) => {
    this.setState({ toAddress: address });
  };

  fillAmount = (amount) => {
    let amountToFill = amount;
    if (amount.isLessThan(BigNumber(0))) {
      amountToFill = BigNumber(0);
    }

    this.setState({ amount: amountToFill.toString() });
  };

  _verusPay = () => {
    let navigation = this.props.navigation;

    navigation.navigate("VerusPay", {
      fillAddress: this.fillAddress,
      fillAmount: this.fillAmount,
    });
  };

  incrementSecretCounter = () => {
    this.setState({
      addressCheckSecretCounter: this.state.addressCheckSecretCounter + 1
    }, () => {
      if (this.state.addressCheckSecretCounter >= this.ADDR_CHECK_SECRET_COUNTER_TRIGGER) {
        Alert.alert("Info", "Simple address validation disabled.")
        this.setState({
          addressCheckEnabled: false
        })
      }
    })
  }

  getPrivKey = () => {
    const { activeAccount, activeCoin, channel } = this.props

    if (activeAccount != null && activeAccount.keys[activeCoin.id] != null && activeAccount.keys[activeCoin.id][channel] != null) {
      return activeAccount.keys[activeCoin.id][channel].privKey
    } else return null
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

        const toAddress = removeSpaces(this.state.toAddress);
        const fromAddress = this.state.fromAddress;
        const amount =
          (this.state.amount.toString().includes(".") &&
            this.state.amount.toString().includes(",")) ||
          !this.state.amount
            ? this.state.amount
            : this.state.amount.toString().replace(/,/g, ".");
        const account = this.state.account;
        let _errors = false;

        if (!toAddress || toAddress.length < 1) {
          this.handleFormError("Required field", "toAddress");
          _errors = true;
        } else if (this.state.addressCheckEnabled && (toAddress.length < 33 || toAddress.length > 42)) {
          this.handleFormError("Invalid address", "toAddress");
          _errors = true;
        }

        if (!amount.toString()) {
          this.handleFormError("Required field", "amount");
          _errors = true;
        } else if (!isNumber(amount)) {
          this.handleFormError("Invalid amount", "amount");
          _errors = true;
        } else if (Number(amount) > Number(spendableBalance)) {
          this.handleFormError(
            "Insufficient funds, " +
              (spendableBalance < 0
                ? "available amount is less than fee"
                : spendableBalance + " available"),
            "amount"
          );
          _errors = true;
        }

        if (!coin) {
          Alert.alert("No active coin", "No current active coin");
          _errors = true;
        }

        if (!account) {
          Alert.alert("No active account", "No current active account");
          _errors = true;
        }

        if (!fromAddress) {
          Alert.alert("No from address", "No current active from address");
          _errors = true;
        }

        if (!_errors) {
          this.goToConfirmScreen(coin, account, toAddress, amount);
        }
      }
    );
  };

  claimSuccess() {
    this.props.dispatch({
      type: DISABLE_CLAIM_BUTTON
    })

    this.setState({
      rewardModalOpen: false
    }, () => {
      Alert.alert("Success!", "RFOX claimed, it may take a few minutes to show in your wallet.")
    })
  }

  render() {
    const { balances, claimDisabled } = this.props;
    const hasRewards = this.state.rewards.gt(this.ZERO)
    const privKey = this.getPrivKey()

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
              {this.state.rewardModalOpen && <RFoxClaim 
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
              />}
            </Portal>
            <View style={Styles.wideBlock}>
              <Input
                labelStyle={Styles.formInputLabel}
                label={"To:"}
                onChangeText={(text) =>
                  this.setState({ toAddress: removeSpaces(text) })
                }
                onSubmitEditing={Keyboard.dismiss}
                value={this.state.toAddress}
                autoCapitalize={"none"}
                autoCorrect={false}
                errorMessage={
                  this.state.formErrors.toAddress
                    ? this.state.formErrors.toAddress
                    : null
                }
              />
            </View>
            <View style={Styles.wideBlock}>
              <Input
                labelStyle={Styles.formInputLabel}
                label={"Amount:"}
                onChangeText={(text) => this.setState({ amount: text })}
                onSubmitEditing={Keyboard.dismiss}
                value={this.state.amount.toString()}
                shake={this.state.formErrors.amount}
                rightIcon={
                  balances.results ? (
                    <TouchableOpacity onPress={this.maxAmount}>
                      <Text style={Styles.linkText}>{"MAX"}</Text>
                    </TouchableOpacity>
                  ) : null
                }
                keyboardType={"decimal-pad"}
                autoCapitalize="words"
                errorMessage={
                  this.state.formErrors.amount
                    ? this.state.formErrors.amount
                    : null
                }
              />
              <View
                style={{
                  ...Styles.fullWidthFlexCenterBlock,
                  paddingBottom: 0,
                }}
              >
                <TouchableOpacity onPress={this._verusPay}>
                  <VerusPayLogo width={40} height={40} />
                </TouchableOpacity>
              </View>
            </View>
            {this.state.loading ? (
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Text style={Styles.centralHeader}>
                  Updating balance...
                </Text>
                <ActivityIndicator
                  animating={this.state.loading}
                  size="large"
                />
              </View>
            ) : this.state.loadingBTCFees ? (
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Text style={Styles.centralHeader}>
                  Loading BTC Fees...
                </Text>
                <ActivityIndicator
                  animating={this.state.loadingBTCFees}
                  size="large"
                />
              </View>
            ) : this.state.btcFeesErr ? (
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Text
                  style={{ ...Styles.centralHeader, ...Styles.errorText }}
                >
                  BTC Fees Error!
                </Text>
              </View>
            ) : balances.errors ? (
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Text
                  style={{ ...Styles.centralHeader, ...Styles.errorText }}
                >
                  Connection Error
                </Text>
              </View>
            ) : (
              <React.Fragment>
                <View
                  style={
                    hasRewards
                      ? Styles.standardWidthSpaceBetweenBlock
                      : Styles.fullWidthFlexCenterBlock
                  }
                >
                  {hasRewards ? (
                    <StandardButton
                      onPress={() => this.setState({
                        rewardModalOpen: true
                      })}
                      title="CLAIM"
                      color={Colors.successButtonColor}
                      disabled={claimDisabled}
                    />
                  ) : null}
                  <StandardButton
                    onPress={this.validateFormData}
                    title="SEND"
                  />
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
              </React.Fragment>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_BALANCES]
  
  return {
    channel,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoin: state.coins.activeCoin,
    balances: {
      results: state.ledger.balances[channel][chainTicker],
      errors: state.errors[API_GET_BALANCES][channel][chainTicker],
    },
    activeAccount: state.authentication.activeAccount,
    claimDisabled: state.coinMenus.claimDisabled
  }
};

export default connect(mapStateToProps)(SendCoin);