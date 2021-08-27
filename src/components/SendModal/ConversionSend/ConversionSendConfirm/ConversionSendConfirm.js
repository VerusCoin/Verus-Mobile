import BigNumber from "bignumber.js";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_FORM_STEP_FORM } from "../../../../utils/constants/sendModal";
import { isNumber, truncateDecimal } from "../../../../utils/math";
import { ConversionSendConfirmRender } from "./ConversionSendConfirm.render"

class ConversionSendConfirm extends Component {
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

    this.setState({
      confirmationFields: [],
    });

    this.props.setLoading(false)
  }

  submitData = async () => {
    await this.props.setLoading(true)
    await this.props.setPreventExit(true)

    this.props.setPreventExit(false)
    this.props.setLoading(false)
  };

  render() {
    return ConversionSendConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => { 

  return {};
};

export default connect(mapStateToProps)(ConversionSendConfirm);