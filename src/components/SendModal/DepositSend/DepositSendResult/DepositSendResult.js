import { Component } from "react"
import { connect } from 'react-redux'
import { Linking } from 'react-native'
import { closeSendModal } from "../../../../actions/actions/sendModal/dispatchers/sendModal";
import { explorers } from "../../../../utils/CoinData/CoinData";
import { DepositSendResultRender } from "./DepositSendResult.render"

class DepositSendResult extends Component {
  constructor(props) {
    super(props);

    this.state = {
      params: props.route.params == null ? {} : props.route.params.txResult,
    };
  }

  finishSend() {
    closeSendModal();
  }

  render() {
    return DepositSendResultRender.call(this);
  }
}

const mapStateToProps = (state) => { 
  return {};
};

export default connect(mapStateToProps)(DepositSendResult);