import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert, Dimensions } from "react-native";
import { connect } from 'react-redux'
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getConversionPaths } from "../../../../utils/api/routers/getConversionPaths";
import { preflightConversion } from "../../../../utils/api/routers/preflightConversion";
import { USD } from "../../../../utils/constants/currencies";
import { API_CONVERT, API_GET_BALANCES, API_GET_FIATPRICE, API_SEND, DLIGHT_PRIVATE } from "../../../../utils/constants/intervalConstants";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FROM_CURRENCY_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
} from "../../../../utils/constants/sendModal";
import { ConversionSendFormRender } from "./ConversionSendForm.render"

class ConversionSendForm extends Component {
  constructor(props) {
    super(props);
    this.SEND_CURRENCY = "send";
    this.RECEIVE_CURRENCY = "receive";

    this.LIST_OPTIONS = {
      [this.SEND_CURRENCY]: {
        formatData: (option) => {
          return {
            key: option.id,
            title: `Convert from ${option.display_ticker}`,
            description: option.display_name,
            value: option,
          };
        },
      },
      [this.RECEIVE_CURRENCY]: {
        formatData: (option) => {
          return {
            key: option.destination.id,
            title: `Convert to ${option.destination.display_ticker}`,
            description: option.destination.display_name,
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
    };

    this.height = Dimensions.get("window").height;
  }

  formHasError = () => {
    const { data } = this.props.sendModal;
    const to = data[SEND_MODAL_TO_CURRENCY_FIELD];
    const from = data[SEND_MODAL_FROM_CURRENCY_FIELD];
    const amount = data[SEND_MODAL_AMOUNT_FIELD];

    if (!amount || amount.length < 1 || isNaN(Number(amount))) {
      createAlert("Invalid Amount", "Please enter a valid amount to convert.");
      return true;
    }

    if (to == null) {
      createAlert("Required Field", "Please select a currency to convert to.");
      return true;
    }

    if (from == null) {
      createAlert("Required Field", "Please select a currency to convert from.");
      return true;
    }

    return false;
  };

  async componentDidMount() {
    if (this.props.sendModal.data[SEND_MODAL_FROM_CURRENCY_FIELD]) {
      this.preloadCurrencies(
        this.props.sendModal.data[SEND_MODAL_FROM_CURRENCY_FIELD],
        this.props.sendModal.data[SEND_MODAL_TO_CURRENCY_FIELD]
      );
    }
  }

  async openSourceOptions() {
    const { coinObj } = this.props.sendModal;

    this.setState({
      selectCurrencyModalParams: {
        type: this.SEND_CURRENCY,
        options: [coinObj],
        open: true,
      },
    });
  }

  async openDestinationOptions() {
    this.setState({
      selectCurrencyModalParams: {
        type: this.RECEIVE_CURRENCY,
        options: Object.values(this.state.conversionPaths),
        open: true,
      },
    });
  }

  selectOption(option) {
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
          if (selectionType === this.SEND_CURRENCY) {
            this.selectSourceCurrency(option);
          } else if (selectionType === this.RECEIVE_CURRENCY) {
            this.selectConversionPath(option);
          }
        }
      }
    );
  }

  async preloadCurrencies(source, dest) {
    this.setState(
      {
        conversionPaths: {},
        selectedConversionPath: null,
      },
      async () => {
        this.props.updateSendFormData(SEND_MODAL_FROM_CURRENCY_FIELD, source);
        this.props.updateSendFormData(SEND_MODAL_TO_CURRENCY_FIELD, dest);

        await this.fetchConversionPaths(source);
        this.setState({
          selectedConversionPath:
            this.state.conversionPaths[this.props.sendModal.data[SEND_MODAL_TO_CURRENCY_FIELD].id],
        });
      }
    );
  }

  selectSourceCurrency(source) {
    return new Promise((resolve) => {
      this.setState(
        {
          conversionPaths: {},
          selectedConversionPath: null,
        },
        async () => {
          this.props.updateSendFormData(SEND_MODAL_FROM_CURRENCY_FIELD, source);
          this.props.updateSendFormData(SEND_MODAL_TO_CURRENCY_FIELD, null);

          await this.fetchConversionPaths(source);
          resolve();
        }
      );
    });
  }

  selectConversionPath(path) {
    this.setState(
      {
        selectedConversionPath: path,
      },
      () => {
        this.props.updateSendFormData(SEND_MODAL_TO_CURRENCY_FIELD, path.destination);
      }
    );
  }

  setLocalLoading(loading) {
    return new Promise((resolve) => {
      this.setState(
        {
          loading: loading,
        },
        () => {
          resolve();
        }
      );
    });
  }

  async fetchConversionPaths(from) {
    await this.setLocalLoading(true);

    try {
      const { subWallet } = this.props.sendModal;
      const channel = subWallet.api_channels[API_CONVERT];

      const conversionPaths = await getConversionPaths(from, channel);

      this.setState({ conversionPaths });
      await this.setLocalLoading(false);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", `Error while fetching potential conversions for ${from}!`);
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
      const channel = subWallet.api_channels[API_CONVERT];

      const res = await preflightConversion(
        coinObj,
        this.props.activeAccount,
        data[SEND_MODAL_FROM_CURRENCY_FIELD],
        data[SEND_MODAL_TO_CURRENCY_FIELD],
        data[SEND_MODAL_TO_ADDRESS_FIELD],
        data[SEND_MODAL_AMOUNT_FIELD],
        channel,
        {}
      );

      if (res.err) throw new Error(res.result);

      this.props.setModalHeight(this.height >= 720 ? 696 : this.height - 24);

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        coinObj,
        activeAccount: this.props.activeAccount,
        txConfirmation: res.result,
        channel
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    this.props.setLoading(false);
  };

  render() {
    return ConversionSendFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
  const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
  const rates_channel = state.sendModal.subWallet.api_channels[API_GET_FIATPRICE];
 
  return {
    sendModal: state.sendModal,
    balances: {
      results: state.ledger.balances[balance_channel]
        ? state.ledger.balances[balance_channel][chainTicker]
        : null,
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    activeAccount: state.authentication.activeAccount,
    rates: state.ledger.rates[rates_channel],
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(ConversionSendForm);