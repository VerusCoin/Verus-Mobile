import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { expireCoinData } from "../../../../actions/actionCreators";
import { convert } from "../../../../utils/api/routers/convert";
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_GET_TRANSACTIONS } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT } from "../../../../utils/constants/sendModal";
import { isNumber, truncateDecimal } from "../../../../utils/math";
import { WithdrawSendConfirmRender } from "./WithdrawSendConfirm.render"

class WithdrawSendConfirm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      params: props.route.params.txConfirmation,
      channel: props.route.params.channel,
      coinObj: props.route.params.coinObj,
      activeAccount: props.route.params.activeAccount,
      destination: props.route.params.destination,
      confirmationFields: [],
    };
  }

  goBack() {
    this.props.setModalHeight();
    this.props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }

  componentDidMount() {
    this.props.setLoading(true);

    const {
      fee,
      fromAddress,
      destAmount,
      fromCurrency,
      toCurrency,
      price,
      balanceDelta
    } = this.state.params;

    this.setState({
      confirmationFields: [
        {
          key: "Withdraw",
          data: `${truncateDecimal(
            BigNumber(balanceDelta).plus(fee).multipliedBy(-1).toString(),
            8
          )} ${fromCurrency}`,
        },
        {
          key: "Receive",
          data: `${truncateDecimal(destAmount, 8)} ${toCurrency}`,
        },
        {
          key: "Fee",
          data: `${truncateDecimal(fee, 8)} ${fromCurrency}`,
        },
        {
          key: "Rate",
          data: `${price == null ? "0" : truncateDecimal(price, 8)} ${toCurrency}/${fromCurrency}`,
          condition: price != null && toCurrency !== fromCurrency,
        },
        {
          key: "Source",
          data: fromAddress,
        },
        {
          key: "Destination",
          data: this.state.destination.displayName,
        },
      ],
    });

    this.props.setLoading(false);
  }

  submitData = async () => {
    await this.props.setLoading(true);
    await this.props.setPreventExit(true);

    const { toAddress, value, fromCurrency, toCurrency } = this.state.params;

    try {
      const res = await convert(
        this.state.coinObj,
        this.state.activeAccount,
        fromCurrency,
        toCurrency,
        toAddress,
        value,
        this.state.channel,
        this.state.params
      );

      if (res.result.txid == null) throw new Error("Transaction failed.");

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, { txResult: res.result });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    this.props.dispatch(expireCoinData(this.state.coinObj.id, API_GET_FIATPRICE));
    this.props.dispatch(expireCoinData(this.state.coinObj.id, API_GET_TRANSACTIONS));
    this.props.dispatch(expireCoinData(this.state.coinObj.id, API_GET_BALANCES));

    this.props.setPreventExit(false);
    this.props.setLoading(false);
  };

  render() {
    return WithdrawSendConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => { 

  return {};
};

export default connect(mapStateToProps)(WithdrawSendConfirm);