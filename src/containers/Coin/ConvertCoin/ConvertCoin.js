/*
  This component is responsible for allowing a user to create
  conversion transactions/transfers (if the card they are using allows it)
*/

import React, { Component } from "react"
import { connect } from 'react-redux'
import { API_GET_CONVERSION_PATHS } from "../../../utils/constants/intervalConstants";
import { ConvertCoinRender } from "./ConvertCoin.render"

class ConvertCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return ConvertCoinRender.call(this)
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const channel =
    state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_CONVERSION_PATHS];

  return {
    activeCoin: state.coins.activeCoin,
    subWallet: state.coinMenus.activeSubWallets[chainTicker],
    conversions: state.ledger.conversions[channel][chainTicker]
  }
};

export default connect(mapStateToProps)(ConvertCoin);