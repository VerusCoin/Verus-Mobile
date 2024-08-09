import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert, Dimensions } from "react-native";
import { connect } from 'react-redux'
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { preflightSend } from "../../../../utils/api/routers/preflightSend";
import { USD } from "../../../../utils/constants/currencies";
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_WITHDRAW_DESTINATIONS,
} from "../../../../utils/constants/intervalConstants";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_SOURCE_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FROM_CURRENCY_FIELD,
} from "../../../../utils/constants/sendModal";
import { DepositSendFormRender } from "./DepositSendForm.render"

class DepositSendForm extends Component {
  constructor(props) {
    super(props);
    this.SOURCE_CURRENCY = "source";

    this.LIST_OPTIONS = {
      [this.SOURCE_CURRENCY]: {
        formatData: (option) => {
          return {
            key: option.sourceCurrencyId,
            title: `Convert from ${option.sourceCurrencyId}`,
            value: option,
          };
        },
      },
    };

    this.state = {
      conversionPaths: {},
      selectedConversionPath: null,
      depositAmount: "",
      chargeAmount: "",
      loading: false,
      controlAmounts: false,
      selectCurrencyModalParams: {
        type: this.SOURCE_CURRENCY,
        options: [],
        open: false,
      },
      sourceListParams: {
        options: [],
        open: false,
      }
    };

    this.height = Dimensions.get("window").height;
  }

  formHasError = () => {
    const { data } = this.props.sendModal;
    const to = data[SEND_MODAL_FROM_CURRENCY_FIELD];
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

  async openSourceCurrencyOptions() {
    this.setState({
      selectCurrencyModalParams: {
        type: this.SOURCE_CURRENCY,
        options: Object.values(this.state.conversionPaths),
        open: true,
      },
    });
  }

  async openSourceOptions() {
    this.setState({
      sourceListParams: {
        options: this.props.depositSources.map(destination => {
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
          type: this.SOURCE_CURRENCY,
          options: [],
          open: false,
        },
      },
      async () => {
        if (option != null) {
          if (selectionType === this.SOURCE_CURRENCY) {
            this.selectConversionPath(option);
          }
        }
      }
    );
  }

  selectSourceOption(destination) {
    this.setState(
      {
        sourceListParams: {
          options: [],
          open: false,
        },
      },
      async () => {
        if (destination != null) {
          this.props.updateSendFormData(SEND_MODAL_SOURCE_FIELD, destination);
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
        this.props.updateSendFormData(SEND_MODAL_FROM_CURRENCY_FIELD, path);
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
    const source = data[SEND_MODAL_SOURCE_FIELD]

    try {
      this.setState({ conversionPaths: source.currencies });
      await this.setLocalLoading(false);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", `Error while fetching potential conversions for ${source.displayName}!`);
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
      [send ? "depositAmount" : "chargeAmount"]: amount,
    });
  }

  updateFormAmount(input, isSend) {
    const value = input.replace(/,/g, '.')
    const validInput = this.isValidAmount(value);

    if (!isSend) {
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
        data[SEND_MODAL_SOURCE_FIELD].destinationId,
        BigNumber(data[SEND_MODAL_AMOUNT_FIELD]),
        channel,
        {
          sourceCurrency: data[SEND_MODAL_FROM_CURRENCY_FIELD].sourceCurrencyId,
          invertSourceDest: true
        }
      );

      if (res.err) throw new Error(res.result);

      this.props.setModalHeight(this.height >= 720 ? 696 : this.height - 24);

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        coinObj,
        activeAccount: this.props.activeAccount,
        txConfirmation: res.result,
        channel,
        source: data[SEND_MODAL_SOURCE_FIELD]
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    this.props.setLoading(false);
  };

  render() {
    return DepositSendFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
  const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
  const rates_channel = state.sendModal.subWallet.api_channels[API_GET_FIATPRICE];
  const deposit_channel = state.sendModal.subWallet.api_channels[API_GET_WITHDRAW_DESTINATIONS];
 
  return {
    sendModal: state.sendModal,
    balances: {
      results: state.ledger.balances[balance_channel]
        ? state.ledger.balances[balance_channel][chainTicker]
        : null,
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    },
    depositSources:
      state.ledger.depositSources[deposit_channel] ||
      state.ledger.depositSources[deposit_channel][chainTicker] == null
        ? []
        : state.ledger.depositSources[deposit_channel][chainTicker],
    activeAccount: state.authentication.activeAccount,
    rates: state.ledger.rates[rates_channel],
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
  };
};

export default connect(mapStateToProps)(DepositSendForm);