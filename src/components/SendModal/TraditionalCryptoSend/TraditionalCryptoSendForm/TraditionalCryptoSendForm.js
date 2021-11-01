import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { traditionalCryptoSend, TraditionalCryptoSendFee } from "../../../../actions/actionDispatchers";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getRecommendedBTCFees } from "../../../../utils/api/channels/general/callCreators";
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_SEND, DLIGHT_PRIVATE, ELECTRUM, GENERAL } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_MEMO_FIELD, SEND_MODAL_TO_ADDRESS_FIELD } from "../../../../utils/constants/sendModal";
import { isNumber, truncateDecimal } from "../../../../utils/math";
import { TraditionalCryptoSendFormRender } from "./TraditionalCryptoSendForm.render"

class TraditionalCryptoSendForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      amountFiat: false,
      transactionData: {},
    };

    this.FEE_CALCULATORS = {
      ["BTC"]: {
        [ELECTRUM]: {
          calculator: getRecommendedBTCFees,
          isPerByte: true,
        },
      },
      ["TESTNET"]: {
        [ELECTRUM]: {
          calculator: () => getRecommendedBTCFees(true),
          isPerByte: true,
        },
      },
    };
  }

  translateAmount = (amount, fromFiat = false) => {
    let _price =
      this.props.rates[this.props.sendModal.coinObj.id] != null
        ? this.props.rates[this.props.sendModal.coinObj.id][this.props.displayCurrency]
        : null;

    return _price == null
      ? fromFiat
        ? "0"
        : amount
      : this.state.amountFiat
      ? fromFiat
        ? BigNumber(amount).dividedBy(BigNumber(_price)).toString()
        : BigNumber(amount).multipliedBy(BigNumber(_price)).toString()
      : amount;
  };

  fillAmount = (amount) => {
    let displayAmount = BigNumber(this.translateAmount(amount));
    if (displayAmount.isLessThan(BigNumber(0))) {
      displayAmount = BigNumber(0);
    }

    this.props.updateSendFormData(
      SEND_MODAL_AMOUNT_FIELD,
      this.state.amountFiat ? truncateDecimal(displayAmount, 2) : displayAmount.toString()
    );
  };

  getPrice = () => {
    const { state, props } = this;
    const { amountFiat } = state;
    const { rates, displayCurrency, sendModal } = props;
    const { coinObj } = sendModal

    const amount = Number(sendModal.data[SEND_MODAL_AMOUNT_FIELD]);

    let _price = rates[coinObj.id] != null ? rates[coinObj.id][displayCurrency] : null;

    if (amount == null || !isNumber(amount) || !_price) {
      return 0;
    }

    if (amountFiat) {
      return truncateDecimal(amount / _price, 5);
    } else {
      return truncateDecimal(amount * _price, 2);
    }
  };

  getProcessedAmount() {
    const { data } = this.props.sendModal;

    const amount =
      (data[SEND_MODAL_AMOUNT_FIELD].includes(".") &&
        data[SEND_MODAL_AMOUNT_FIELD].includes(",")) ||
      !data[SEND_MODAL_AMOUNT_FIELD]
        ? data[SEND_MODAL_AMOUNT_FIELD]
        : data[SEND_MODAL_AMOUNT_FIELD].replace(/,/g, ".");

    if (!amount || amount.length < 0) {
      return null;
    } else if (!isNumber(Number(amount))) {
      return null;
    } else {
      return this.translateAmount(amount, this.state.amountFiat);
    }
  }

  formHasError = () => {
    const { subWallet, coinObj, data } = this.props.sendModal;
    const channel = subWallet.api_channels[API_SEND]

    const spendableBalance = this.props.balances.results.confirmed;

    const toAddress =
      data[SEND_MODAL_TO_ADDRESS_FIELD] != null ? data[SEND_MODAL_TO_ADDRESS_FIELD].trim() : "";

    const amount = this.getProcessedAmount()

    if (!toAddress || toAddress.length < 1) {
      createAlert("Required Field", "Address is a required field.");
      return true;
    }

    if (amount == null) {
      createAlert("Invalid Amount", "Please enter a valid number amount.");
      return true;
    } else {
      if (Number(amount) > Number(spendableBalance)) {
        const message =
          "Insufficient funds, " +
          (spendableBalance < 0
            ? "available amount is less than fee"
            : spendableBalance +
              " confirmed " +
              coinObj.id +
              " available." +
              (channel === DLIGHT_PRIVATE
                ? "\n\nFunds from private transactions require 10 confirmations (~10 minutes) before they can be spent."
                : ""));

        createAlert("Insufficient Funds", message);
        return true;
      }
    }

    return false;
  };

  submitData = async () => {
    if (this.formHasError()) return;

    this.props.setLoading(true);

    const { subWallet, coinObj, data } = this.props.sendModal;
    const channel = subWallet.api_channels[API_SEND]
    const address = data[SEND_MODAL_TO_ADDRESS_FIELD];
    const amount = this.getProcessedAmount()
    const memo = data[SEND_MODAL_MEMO_FIELD];

    let tradCryptoFees;

    if (this.FEE_CALCULATORS[coinObj.id] && this.FEE_CALCULATORS[coinObj.id][channel]) {
      const feeData = this.FEE_CALCULATORS[coinObj.id][channel];

      tradCryptoFees = new TraditionalCryptoSendFee(
        (await feeData.calculator()).average,
        feeData.isPerByte
      );
    }

    try {
      const res = await traditionalCryptoSend(
        coinObj,
        channel,
        address,
        BigNumber(truncateDecimal(amount, coinObj.decimals)),
        memo,
        tradCryptoFees,
        true
      );

      this.props.setModalHeight(696);

      if (res.feeTakenMessage != null) {
        Alert.alert("Amount changed", res.feeTakenMessage)
      }

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, { txConfirmation: res });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    this.props.setLoading(false);
  };

  maxAmount = () => {
    const { balances } = this.props;

    this.fillAmount(BigNumber(balances.results.confirmed));
  };

  render() {
    return TraditionalCryptoSendFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
  const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
  const rates_channel = state.sendModal.subWallet.api_channels[API_GET_FIATPRICE];
 
  return {
    sendModal: state.sendModal,
    balances: {
      results: state.ledger.balances[balance_channel][chainTicker],
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    activeAccount: state.authentication.activeAccount,
    rates: state.ledger.rates[rates_channel],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(TraditionalCryptoSendForm);