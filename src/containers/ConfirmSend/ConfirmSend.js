/*
  This screen is to show the user the result of their transaction
  pre-flight check, and the details of their transaction. It is passed
  transaction data from the sendCoin component, and builds a model transaction
  using that data + the user's authentication data that they decrypted while entering
  their password.
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import { networks } from 'bitgo-utxo-lib';
import { Keyboard, Clipboard, Linking } from "react-native";
import { isNumber, satsToCoins, truncateDecimal } from '../../utils/math';
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { NO_VERIFICATION, MID_VERIFICATION } from '../../utils/constants/constants'
import { preflightSend } from "../../utils/api/routers/preflightSend";
import { API_GET_FIATPRICE, API_GET_TRANSACTIONS, ELECTRUM, GENERAL } from "../../utils/constants/intervalConstants";
import BigNumber from "bignumber.js";
import { renderError, renderLoading, renderTransactionInfo } from './ConfirmSend.render'
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { send } from "../../utils/api/routers/send";
import { explorers } from "../../utils/CoinData/CoinData";
import { expireCoinData } from "../../actions/actionCreators";
import { USD } from "../../utils/constants/currencies";
import { extractIdentityAddress } from "../../utils/api/channels/verusid/callCreators";
import { openUrl } from "../../utils/linking";

const TIMEOUT_LIMIT = 300000
const LOADING_TICKER = 5000

class ConfirmSend extends Component {
  constructor(props) {
    super(props);
    this.state = {
      toAddress: "",
      fromAddress: "",
      err: false,
      coinObj: {},
      utxoCrossChecked: false,
      loading: true,
      network: null,
      fee: 0,
      amountSubmitted: "0",
      balance: 0,
      remainingBalance: 0,
      finalTxAmount: 0,
      memo: null,
      loadingProgress: 0.175,
      loadingMessage: "Creating transaction...",
      btcFeePerByte: null,
      feeTakenFromAmount: false,
      feeCurr: null,
      note: null,
      txid: null,
      sendTx: false,
      channel: null,
      identity: null
    };
  }

  copyTxIDToClipboard = () => {
    Clipboard.setString(this.state.txid);
    createAlert("ID Copied", `${this.state.txid} copied to clipboard.`);
  };

  copyAddressToClipboard = (data) => {
    Clipboard.setString(data);
    createAlert("Address Copied", `${data} copied to clipboard.`);
  };

  copyVerusIDToClipboard = (data) => {
    Clipboard.setString(data);
    createAlert("VerusID Destination Copied", `${data} copied to clipboard.`);
  };

  openExplorer = () => {
    let url = `${explorers[this.state.coinObj.id]}/tx/${this.state.txid}`;

    openUrl(url)
  };

  navigateToScreen = (coinObj, route) => {
    let navigation = this.props.navigation;
    let data = {};

    if (route === "Send") {
      data = {
        coinObj: coinObj,
        activeAccount: this.props.activeAccount,
      };
    } else {
      data = coinObj;
    }

    navigation.navigate(route, {
      data: data,
    });
  };

  async componentDidMount() {
    const sendTx = this.props.route.params.data.sendTx;
    const coinObj = this.props.route.params.data.coinObj;
    const activeUser = this.props.route.params.data.activeUser;
    const address = this.props.route.params.data.address;
    const amount = BigNumber(
      truncateDecimal(
        this.props.route.params.data.amount,
        this.props.route.params.data.coinObj.decimals
      )
    );
    const fromAddress = this.props.route.params.data.fromAddress;
    const channel = this.props.route.params.data.channel;
    const fee =
      coinObj.id === "BTC"
        ? { feePerByte: BigNumber(this.props.route.params.data.btcFee) }
        : isNumber(this.props.route.params.data.coinObj.fee)
        ? BigNumber(this.props.route.params.data.coinObj.fee)
        : null;
    const network = networks[coinObj.id.toLowerCase()]
      ? networks[coinObj.id.toLowerCase()]
      : networks["default"];
    const balance = BigNumber(this.props.route.params.data.balance);
    const note = this.props.route.params.data.note;
    const memo = this.props.route.params.data.memo;

    this.timeoutTimer = setTimeout(() => {
      if (this.state.loading) {
        this.setState({
          err:
            "Timed out while trying to build transaction, this may be a networking error.",
          loading: false,
        });
      }
    }, TIMEOUT_LIMIT);

    this.loadingInterval = setInterval(() => {
      this.tickLoading();
    }, LOADING_TICKER);

    let verifyMerkle, verifyTxid;

    if (this.props.coinSettings[coinObj.id]) {
      verifyMerkle =
        this.props.coinSettings[coinObj.id].verificationLvl > MID_VERIFICATION
          ? true
          : false;
      verifyTxid =
        this.props.coinSettings[coinObj.id].verificationLvl > NO_VERIFICATION
          ? true
          : false;
    } else {
      console.warn(
        `No coin settings data found for ${
          coinObj.id
        } in ConfirmSend, assuming highest verification level`
      );
      verifyMerkle = true;
      verifyTxid = true;
    }

    try {
      let identity
      let destinationAddress

      if (address.includes("@")) {
        destinationAddress = await extractIdentityAddress(address, coinObj.id)
        identity = address
      } else {
        destinationAddress = address
      }

      const params = [
        coinObj,
        activeUser,
        destinationAddress,
        amount,
        channel,
        { defaultFee: fee, network, verifyMerkle, verifyTxid, memo },
      ];

      this.setState({ sendTx, channel });

      const res = sendTx ? await send(...params) : await preflightSend(...params);

      if (res.err || !res) {
        this.setState({
          loading: false,
          err: res ? res.result : "Unknown error",
        });
        clearInterval(this.loadingInterval);
      } else {
        clearInterval(this.loadingInterval);

        if (sendTx) {
          createAlert(
            "Success!",
            "Transaction sent. Your balance and transactions may take a few minutes to update."
          );

          this.props.dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
          this.props.dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));

          this.setState({
            loading: false,
            toAddress: destinationAddress,
            identity: this.props.route.params.data.identity,
            fromAddress,
            fee:
              res.result.fee ||
              (coinObj.id === "BTC"
                ? satsToCoins(fee.feePerByte)
                : satsToCoins(fee)),
            feeCurr: res.result.feeCurr,
            utxoCrossChecked: true,
            coinObj: coinObj,
            activeUser: activeUser,
            memo,
            finalTxAmount: res.result.value != null ? res.result.value : amount,
            loadingProgress: 1,
            loadingMessage: "Done",
            btcFeePerByte:
              fee != null && fee.feePerByte != null ? fee.feePerByte : null,
            note,
            txid: res.result.txid,
          });
        } else {
          let feeTakenFromAmount = res.result.params.feeTakenFromAmount;

          let finalTxAmount =
            feeTakenFromAmount ||
            (res.result.feeCurr != null && res.result.feeCurr !== coinObj.id)
              ? res.result.value
              : BigNumber(res.result.value)
                  .plus(BigNumber(res.result.fee))
                  .toString();

          let remainingBalance = feeTakenFromAmount
            ? BigNumber(balance)
                .minus(BigNumber(finalTxAmount))
                .minus(BigNumber(res.result.fee))
                .toString()
            : BigNumber(balance)
                .minus(BigNumber(finalTxAmount))
                .toString();

          if (feeTakenFromAmount) {
            if (
              res.result.unshieldedFunds == null ||
              res.result.unshieldedFunds.isEqualTo(BigNumber(0))
            ) {
              createAlert(
                "Warning",
                "Your transaction amount has been changed to " +
                  finalTxAmount +
                  " " +
                  coinObj.id +
                  " as you do not have sufficient funds to cover your submitted amount of " +
                  res.result.amountSubmitted +
                  " " +
                  coinObj.id +
                  " + a fee of " +
                  res.result.fee +
                  " " +
                  coinObj.id +
                  "."
              );
            } else if (res.result.unshieldedFunds != null) {
              createAlert(
                "Warning",
                "Your transaction amount has been changed to " +
                  finalTxAmount +
                  " " +
                  coinObj.id +
                  " as you do not have sufficient funds to cover your submitted amount of " +
                  res.result.amountSubmitted +
                  " " +
                  coinObj.id +
                  " + a fee of " +
                  res.result.fee +
                  " " +
                  coinObj.id +
                  ". This could be due to the " +
                  satsToCoins(res.result.unshieldedFunds).toString() +
                  " in unshielded " +
                  coinObj.id +
                  " your " +
                  "wallet contains. Log into a native client and shield your mined funds to be able to use them."
              );
            }
          }

          this.setState({
            loading: false,
            toAddress: res.result.toAddress,
            identity,
            fromAddress: res.result.fromAddress,
            network: res.result.params.network,
            fee: res.result.fee,
            feeCurr: res.result.feeCurr,
            amountSubmitted: res.result.amountSubmitted,
            utxoCrossChecked: res.result.params.utxoVerified,
            coinObj: coinObj,
            activeUser: activeUser,
            balance,
            memo: res.result.memo,
            remainingBalance: remainingBalance,
            finalTxAmount: finalTxAmount,
            loadingProgress: 1,
            loadingMessage: "Done",
            btcFeePerByte:
              fee != null && fee.feePerByte != null ? fee.feePerByte : null,
            feeTakenFromAmount: feeTakenFromAmount,
            note,
            txid: res.result.txid,
          });
        }
      }
    } catch (e) {
      this.setState({
        loading: false,
        err: e.message
          ? e.message.includes("has no matching Script")
            ? `"${address}" is not a valid destination.`
            : e.message
          : "Unknown error while building transaction, double check form data",
      });
      console.log(e);
    }
  }

  componentWillUnmount() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  sendTx = () => {
    Keyboard.dismiss();
    const route = "ConfirmSend";
    let navigation = this.props.navigation;
    let data = {
      sendTx: true,
      coinObj: this.state.coinObj,
      activeUser: this.state.activeUser,
      identity: this.state.identity,
      address: this.state.toAddress,
      fromAddress: this.state.fromAddress,
      amount:
        this.state.feeTakenFromAmount ||
        (this.state.feeCurr != null &&
          this.state.feeCurr !== this.state.coinObj.id)
          ? this.state.finalTxAmount
          : BigNumber(this.state.finalTxAmount)
              .minus(BigNumber(this.state.fee))
              .toString(),
      btcFee: this.state.btcFeePerByte,
      channel: this.state.channel,
      memo: this.state.memo,
    };

    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [{ name: route, params: { data: data } }],
    });

    navigation.dispatch(resetAction);
  };

  tickLoading = () => {
    //This is cheeky but it actually does all these things
    let loadingMessages = [
      "Bundling transaction info...",
      "Verifying transaction info...",
      "Verifying merkle root...",
      "Signing Transaction...",
    ];

    let index = 0;

    while (
      index < loadingMessages.length &&
      loadingMessages[index] !== this.state.loadingMessage
    ) {
      index++;
    }

    if (index < loadingMessages.length - 1) {
      this.setState({
        loadingMessage: loadingMessages[index + 1],
        loadingProgress: this.state.loadingProgress + 0.175,
      });
    } else if (index === loadingMessages.length) {
      this.setState({
        loadingMessage: loadingMessages[0],
        loadingProgress: this.state.loadingProgress + 0.175,
      });
    }
  };

  render() {
    return this.state.loading
      ? renderLoading.call(this)
      : this.state.err
      ? renderError.call(this)
      : renderTransactionInfo.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    coinSettings: state.settings.coinSettings,
    rates: state.ledger.rates[GENERAL],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  }
};

export default connect(mapStateToProps)(ConfirmSend);

