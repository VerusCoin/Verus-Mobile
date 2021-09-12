import { Component } from "react"
import { connect } from 'react-redux'
import { Linking } from 'react-native'
import { closeSendModal } from "../../../../actions/actions/sendModal/dispatchers/sendModal";
import { explorers } from "../../../../utils/CoinData/CoinData";
import { WithdrawSendResultRender } from "./WithdrawSendResult.render"

class WithdrawSendResult extends Component {
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
    return WithdrawSendResultRender.call(this);
  }
}

const mapStateToProps = (state) => { 
  return {};
};

export default connect(mapStateToProps)(WithdrawSendResult);