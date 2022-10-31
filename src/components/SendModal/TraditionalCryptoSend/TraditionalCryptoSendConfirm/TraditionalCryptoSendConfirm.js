import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { expireCoinData } from "../../../../actions/actionCreators";
import { traditionalCryptoSend } from "../../../../actions/actionDispatchers";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_GET_TRANSACTIONS, DLIGHT_PRIVATE, GENERAL } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_MEMO_FIELD, SEND_MODAL_TO_ADDRESS_FIELD } from "../../../../utils/constants/sendModal";
import { isNumber, truncateDecimal } from "../../../../utils/math";
import { TraditionalCryptoSendConfirmRender } from "./TraditionalCryptoSendConfirm.render"

class TraditionalCryptoSendConfirm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      params: props.route.params.txConfirmation,
      confirmationFields: []
    };
  }

  goBack() {
    this.props.setModalHeight()
    this.props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM)
  }

  componentDidMount() {
    this.props.setLoading(true);

    const {
      toAddress,
      fromAddress,
      identity,
      amountSubmitted,
      coinObj,
      fees,
      finalTxAmount,
      balanceDelta,
      memo,
    } = this.state.params;
    
    const balance = this.props.balances.results.total;
    const fee = fees[0];
    const remainingBalance = BigNumber(balanceDelta).plus(BigNumber(balance));
    const deductedAmount = BigNumber(balanceDelta).absoluteValue()

    const validFiatMultiplier =
      this.props.rates[coinObj.id] != null &&
      this.props.rates[coinObj.id][this.props.displayCurrency] != null;
    const fiatMultiplier = validFiatMultiplier
      ? BigNumber(this.props.rates[coinObj.id][this.props.displayCurrency])
      : null;

    const validFeeFiatMultiplier =
      fee.currency == coinObj.id
        ? validFiatMultiplier
        : this.props.rates[fee.currency] != null &&
          this.props.rates[fee.currency][this.props.displayCurrency] != null;
    const feeFiatMultiplier =
      fee.currency == coinObj.id
        ? fiatMultiplier
        : validFeeFiatMultiplier
        ? BigNumber(this.props.rates[fee.currency][this.props.displayCurrency])
        : null;

    this.setState({
      confirmationFields: [
        {
          key: 'Destination',
          data: identity == null ? toAddress : `${identity} (${toAddress})`,
          numLines: 100,
          onPress: () =>
            copyToClipboard(toAddress, {
              title: 'Address copied',
              message: `${toAddress} copied to clipboard.`,
            }),
        },
        {
          key: 'Source',
          data: fromAddress,
          numLines: 100,
          onPress: () =>
            copyToClipboard(fromAddress, {
              title: 'Address copied',
              message: `${fromAddress} copied to clipboard.`,
            }),
          condition: fromAddress != null,
        },
        {
          key: 'Amount Requested',
          data:
            truncateDecimal(amountSubmitted, coinObj.decimals || 8) +
            ' ' +
            coinObj.id,
          right: validFiatMultiplier
            ? `${fiatMultiplier.multipliedBy(amountSubmitted).toFixed(2)} ${
                this.props.displayCurrency
              }`
            : null,
          condition:
            amountSubmitted !== '0' && amountSubmitted !== finalTxAmount,
        },
        {
          key: 'Amount Sent',
          data:
            truncateDecimal(finalTxAmount, coinObj.decimals || 8) +
            ' ' +
            coinObj.id,
          right: validFiatMultiplier
            ? `${fiatMultiplier.multipliedBy(finalTxAmount).toFixed(2)} ${
                this.props.displayCurrency
              }`
            : null,
        },
        {
          key: 'Fee',
          data: fee.amount + ' ' + fee.currency,
          right: validFeeFiatMultiplier
            ? `${feeFiatMultiplier.multipliedBy(fee.amount).toFixed(2)} ${
                this.props.displayCurrency
              }`
            : null,
        },
        {
          key: 'Amount Deducted',
          data:
            truncateDecimal(deductedAmount, coinObj.decimals || 8) +
            ' ' +
            coinObj.id,
          right: validFiatMultiplier
            ? `${fiatMultiplier.multipliedBy(deductedAmount).toFixed(2)} ${
                this.props.displayCurrency
              }`
            : null,
        },
        {
          key: 'Remaining Balance',
          data: remainingBalance + ' ' + coinObj.id,
          condition: remainingBalance !== 0,
          right: validFiatMultiplier
            ? `${fiatMultiplier.multipliedBy(remainingBalance).toFixed(2)} ${
                this.props.displayCurrency
              }`
            : null,
        },
        {
          key: 'Message',
          numLines: 100,
          data: memo,
          condition: memo != null && memo.length > 0,
        },
      ],
    });

    this.props.setLoading(false)
  }

  submitData = async () => {
    await this.props.setLoading(true)
    await this.props.setPreventExit(true)

    const {
      toAddress,
      tradSendFee,
      coinObj,
      finalTxAmount,
      memo,
      channel,
      fullResult
    } = this.state.params;

    try {
      const res = await traditionalCryptoSend(coinObj, channel, toAddress, BigNumber(
        truncateDecimal(
          finalTxAmount,
          coinObj.decimals
        )
      ), memo, tradSendFee, false, fullResult)

      if (res.txid == null) throw new Error("Transaction failed.")
  
      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, { txResult: res });
    } catch(e) {
      Alert.alert("Error", e.message)
    }

    this.props.dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));

    this.props.setPreventExit(false)
    this.props.setLoading(false)
  };

  render() {
    return TraditionalCryptoSendConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => { 
  const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
  const rates_channel = state.sendModal.subWallet.api_channels[API_GET_FIATPRICE];
  const chainTicker = ownProps.route.params.txConfirmation.coinObj.id

  return {
    balances: {
      results: state.ledger.balances[balance_channel][chainTicker],
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    rates: state.ledger.rates[rates_channel],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(TraditionalCryptoSendConfirm);