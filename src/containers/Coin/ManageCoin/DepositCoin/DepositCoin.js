// DEPRECATED

import React, { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { API_GET_DEPOSIT_SOURCES, API_GET_PENDING_DEPOSITS } from "../../../../utils/constants/intervalConstants";
import { DepositCoinRender } from "./DepositCoin.render"

class DepositCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bankTransferDetailsModalParams: {
        open: false,
        props: {},
      },
    };
  }

  setBankTransferDetailsModalParams(open, props = {}) {
    this.setState({
      bankTransferDetailsModalParams: {
        open,
        props,
      },
    });
  }

  selectBankTransfer(transfer) {
    Alert.alert(
      "Manual Transfer",
      "To complete this transfer, send the exact amount shown to the specified bank account (You can send money through online banking or mobile banking, etc.).\n\nYou will receive an email notification with the transfer details."
    );

    this.setBankTransferDetailsModalParams(true, {
      transfer,
      title: "Manual Deposit",
      helpButton: {
        label: "Support",
        url: "https://support.sendwyre.com/hc/en-us",
      },
    });
  }

  render() {
    return DepositCoinRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const deposit_sources_channel =
    state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_DEPOSIT_SOURCES];
  const pending_deposits_channel =
    state.coinMenus.activeSubWallets[chainTicker].api_channels[API_GET_PENDING_DEPOSITS];

  return {
    activeCoin: state.coins.activeCoin,
    subWallet: state.coinMenus.activeSubWallets[chainTicker],
    depositSources: state.ledger.depositSources[deposit_sources_channel][chainTicker],
    pendingDeposits: state.ledger.pendingDeposits[pending_deposits_channel][chainTicker],
  };
};

export default connect(mapStateToProps)(DepositCoin);