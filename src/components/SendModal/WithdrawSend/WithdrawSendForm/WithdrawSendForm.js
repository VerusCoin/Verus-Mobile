import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert, Dimensions } from "react-native";
import { connect } from 'react-redux'
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { preflightConversion } from "../../../../utils/api/routers/preflightConversion";
import { preflightSend } from "../../../../utils/api/routers/preflightSend";
import { USD } from "../../../../utils/constants/currencies";
import {
  API_CONVERT,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_WITHDRAW_DESTINATIONS,
  API_SEND,
  DLIGHT_PRIVATE,
} from "../../../../utils/constants/intervalConstants";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_DESTINATION_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_TO_CURRENCY_FIELD,
} from "../../../../utils/constants/sendModal";
import { WithdrawSendFormRender } from "./WithdrawSendForm.render"

class WithdrawSendForm extends Component {
  constructor(props) {
    super(props);
    this.RECEIVE_CURRENCY = "receive";

    this.LIST_OPTIONS = {
      [this.RECEIVE_CURRENCY]: {
        formatData: (option) => {
          return {
            key: option.destinationCurrencyId,
            title: `Convert to ${option.destinationCurrencyId}`,
            value: option,
          };
        },
      },
    };

    this.state = {
      conversionPaths: {},
      selectedConversionPath: null,
      sendAmount: "",
      receiveAmount: "",
      loading: false,
      controlAmounts: false,
      selectCurrencyModalParams: {
        type: this.RECEIVE_CURRENCY,
        options: [],
        open: false,
      },
      destinationListParams: {
        options: [],
        open: false,
      }
    };

    this.height = Dimensions.get('window').height;
  }

  formHasError = () => {
    const { data } = this.props.sendModal;
    const to = data[SEND_MODAL_TO_CURRENCY_FIELD];
    const amount = data[SEND_MODAL_AMOUNT_FIELD];

    if (!amount || amount.length < 1 || isNaN(Number(amount))) {
      createAlert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return true;
    }

    if (to == null) {
      createAlert("Required Field", "Please select a currency to withdraw to.");
      return true;
    }

    return false;
  };

  async openDestinationCurrencyOptions() {
    this.setState({
      selectCurrencyModalParams: {
        type: this.RECEIVE_CURRENCY,
        options: Object.values(this.state.conversionPaths),
        open: true,
      },
    });
  }

  async openDestinationOptions() {
    this.setState({
      destinationListParams: {
        options: this.props.withdrawDestinations.map(destination => {
          const country = ISO_3166_COUNTRIES[destination.countryCode]

          return {
            key: destination.id,
            value: destination,
            title: destination.displayName,
            country,
            description: destination.description,
          };
        }),
        open: true,
      },
    });
  }

  selectCurrencyOption(option) {
    const selectionType = this.state.selectCurrencyModalParams.type;

    this.setState(
      {
        selectCurrencyModalParams: {
          type: this.RECEIVE_CURRENCY,
          options: [],
          open: false,
        },
      },
      async () => {
        if (option != null) {
          if (selectionType === this.RECEIVE_CURRENCY) {
            this.selectConversionPath(option);
          }
        }
      }
    );
  }

  selectDestinationOption(destination) {
    this.setState(
      {
        destinationListParams: {
          options: [],
          open: false,
        },
      },
      async () => {
        if (destination != null) {
          this.props.updateSendFormData(SEND_MODAL_DESTINATION_FIELD, destination);
          await this.fetchConversionPaths()
          this.selectConversionPath(
            this.state.conversionPaths[Object.keys(this.state.conversionPaths)[0]]
          );
        }
      }
    );
  }

  selectConversionPath(path) {
    this.setState(
      {
        selectedConversionPath: path,
      },
      () => {
        this.props.updateSendFormData(SEND_MODAL_TO_CURRENCY_FIELD, path);
      }
    );
  }

  setLocalLoading(loading) {
    return new Promise((resolve) => {
      this.setState(
        {
          loading,
        },
        () => {
          resolve();
        }
      );
    });
  }

  async fetchConversionPaths() {
    await this.setLocalLoading(true);
    const { data } = this.props.sendModal
    const destination = data[SEND_MODAL_DESTINATION_FIELD]

    try {
      this.setState({ conversionPaths: destination.currencies });
      await this.setLocalLoading(false);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", `Error while fetching potential conversions for ${destination.displayName}!`);
      await this.setLocalLoading(false);
    }
  }

  setControlAmounts(x) {
    this.setState({
      controlAmounts: x == true,
    });
  }

  isValidAmount(input) {
    return (
      !isNaN(input) &&
      typeof input === "string" &&
      !(input[input.length - 1] === "." || (input.includes(".") && input[input.length - 1] === "0"))
    );
  }

  updateDisplayAmount(amount, send) {
    this.setState({
      [send ? "sendAmount" : "receiveAmount"]: amount,
    });
  }

  updateFormAmount(input, isSend) {
    const value = input.replace(/,/g, '.')
    const validInput = this.isValidAmount(value);

    if (isSend) {
      this.updateDisplayAmount(value || "", true);

      if (validInput) {
        this.setControlAmounts(true);
        this.props.updateSendFormData(SEND_MODAL_AMOUNT_FIELD, value);
      } else {
        this.setControlAmounts(false);
      }
    } else {
      this.updateDisplayAmount(value || "", false);

      if (validInput) {
        const price =
          this.state.selectedConversionPath != null ? this.state.selectedConversionPath.price : 0;

        this.setControlAmounts(true);
        this.props.updateSendFormData(
          SEND_MODAL_AMOUNT_FIELD,
          price === 0 ? "0" : (Number(value) / price).toFixed(8)
        );
      } else {
        this.setControlAmounts(false);
      }
    }
  }

  submitData = async () => {
    if (this.formHasError()) return;

    this.props.setLoading(true);

    try {
      const { data, coinObj, subWallet } = this.props.sendModal;
      const channel = subWallet.api_channels[API_GET_WITHDRAW_DESTINATIONS];

      const res = await preflightSend(
        coinObj,
        this.props.activeAccount,
        data[SEND_MODAL_DESTINATION_FIELD].destinationId,
        BigNumber(data[SEND_MODAL_AMOUNT_FIELD]),
        channel,
        {
          destCurrency: data[SEND_MODAL_TO_CURRENCY_FIELD].destinationCurrencyId
        }
      );

      if (res.err) throw new Error(res.result);

      this.props.setModalHeight(this.height >= 720 ? 696 : this.height - 24);

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        coinObj,
        activeAccount: this.props.activeAccount,
        txConfirmation: res.result,
        channel,
        destination: data[SEND_MODAL_DESTINATION_FIELD]
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    this.props.setLoading(false);
  };

  render() {
    return WithdrawSendFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
  const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
  const rates_channel = state.sendModal.subWallet.api_channels[API_GET_FIATPRICE];
  const withdraw_channel = state.sendModal.subWallet.api_channels[API_GET_WITHDRAW_DESTINATIONS];
 
  return {
    sendModal: state.sendModal,
    balances: {
      results: state.ledger.balances[balance_channel]
        ? state.ledger.balances[balance_channel][chainTicker]
        : null,
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    withdrawDestinations:
      state.ledger.withdrawDestinations[withdraw_channel] == null ||
      state.ledger.withdrawDestinations[withdraw_channel][chainTicker] == null
        ? []
        : state.ledger.withdrawDestinations[withdraw_channel][chainTicker],
    activeAccount: state.authentication.activeAccount,
    rates: state.ledger.rates[rates_channel],
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(WithdrawSendForm);