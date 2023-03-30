import { Component } from "react"
import { connect } from 'react-redux'
import { Linking } from 'react-native'
import { closeSendModal } from "../../../../actions/actions/sendModal/dispatchers/sendModal";
import { explorers } from "../../../../utils/CoinData/CoinData";
import { TraditionalCryptoSendResultRender } from "./TraditionalCryptoSendResult.render"
import { openUrl } from "../../../../utils/linking";

class TraditionalCryptoSendResult extends Component {
  constructor(props) {
    super(props);

    this.state = {
      params: props.route.params == null ? {} : props.route.params.txResult,
    };
  }

  finishSend() {
    closeSendModal();
  }

  openExplorer = () => {
    const url = `${explorers[this.state.params.coinObj.id]}/tx/${this.state.params.txid}`;

    openUrl(url)
  };

  render() {
    return TraditionalCryptoSendResultRender.call(this);
  }
}

const mapStateToProps = (state) => { 
  return {};
};

export default connect(mapStateToProps)(TraditionalCryptoSendResult);