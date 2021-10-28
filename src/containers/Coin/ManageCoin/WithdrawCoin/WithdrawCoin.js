import React, { Component } from "react"
import { connect } from 'react-redux'
import { API_GET_WITHDRAW_DESTINATIONS } from "../../../../utils/constants/intervalConstants";
import { WithdrawCoinRender } from "./WithdrawCoin.render"

class WithdrawCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return WithdrawCoinRender.call(this)
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const channel = state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_WITHDRAW_DESTINATIONS];

  return {
    activeCoin: state.coins.activeCoin,
    subWallet: state.coinMenus.activeSubWallets[chainTicker],
    withdrawDestinations: state.ledger.withdrawDestinations[channel][chainTicker]
  }
};

export default connect(mapStateToProps)(WithdrawCoin);