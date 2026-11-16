/*
  This component's purpose is to display the detail screen
  of the active coin.
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import { setCoinSubWallet, setIsCoinMenuFocused } from "../../actions/actionCreators";
import { withNavigationFocus } from '@react-navigation/compat';
import { WALLET_APP_CONVERT, WALLET_APP_SEND } from "../../utils/constants/apps";
import SignedInCoinDetail from './SignedInCoinDetail';

const SIGNED_IN_TRANSFER = "signed-in-transfer";
const TRANSFER_SECTION_KEYS = [WALLET_APP_SEND, WALLET_APP_CONVERT];

class CoinMenus extends Component {
  constructor(props) {
    super(props);
    this.generateTabs();
    const subWallets = Array.isArray(props.allSubWallets) ? props.allSubWallets : [];

    this.state = {
      filteredTabKey: null,
    };

    if (subWallets.length == 1)
      props.dispatch(setCoinSubWallet(props.activeCoin.id, subWallets[0]));
  }

  componentDidMount() {
    this.props.dispatch(setIsCoinMenuFocused(true));
  }

  componentDidUpdate(lastProps) {
    if (lastProps.isFocused !== this.props.isFocused) {
      this.props.dispatch(setIsCoinMenuFocused(this.props.isFocused));
    }

    if (
      lastProps.allSubWallets !== this.props.allSubWallets ||
      lastProps.selectedSubWallet !== this.props.selectedSubWallet
    ) {
      this.selectOnlySubWallet();
    }

    if (
      lastProps.selectedSubWallet != this.props.selectedSubWallet &&
      this.state.filteredTabKey != null &&
      this.props.selectedSubWallet != null
    ) {
      this.setState({
        filteredTabKey: null,
      });
    }
  }

  getSubWallets = () => {
    return Array.isArray(this.props.allSubWallets) ? this.props.allSubWallets : [];
  };

  selectOnlySubWallet = () => {
    const subWallets = this.getSubWallets();

    if (this.props.selectedSubWallet == null && subWallets.length == 1) {
      this.props.dispatch(setCoinSubWallet(this.props.activeCoin.id, subWallets[0]));
    }
  };

  generateTabs = () => {
    let tabArray = [];
    let activeTab;
    let activeTabIndex;
    let options = this.props.activeCoin.apps[this.props.activeApp].data;
    const transferSections = options.filter(option => TRANSFER_SECTION_KEYS.includes(option.key));
    let transferTabAdded = false;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const isTransferSection = transferSections.includes(option);

      if (isTransferSection && transferTabAdded) {
        continue;
      }

      const _tab = isTransferSection
        ? {
            key: SIGNED_IN_TRANSFER,
            focusedIcon: option.icon,
            unfocusedIcon: option.icon,
            title: "Transfer",
            activeSection: option,
          }
        : {
            key: option.key,
            focusedIcon: option.icon,
            unfocusedIcon: option.icon,
            title: option.name,
            activeSection: option,
          };

      if (isTransferSection) {
        transferTabAdded = true;
      }

      if (
        option.key === this.props.activeSection.key ||
        (isTransferSection &&
          TRANSFER_SECTION_KEYS.includes(this.props.activeSection.key))
      ) {
        activeTab = _tab;
        activeTabIndex = tabArray.length;
      }

      tabArray.push(_tab);
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key);
    }

    this.props.navigation.setOptions({
      title: '',
    });

    return {
      tabs: tabArray,
      activeTab: activeTab,
      activeTabIndex,
      transferSections,
      transferMode: TRANSFER_SECTION_KEYS.includes(this.props.activeSection.key)
        ? this.props.activeSection.key
        : transferSections[0]?.key,
    };
  };

  render() {
    return (
      <SignedInCoinDetail
        navigation={this.props.navigation}
        route={this.props.route}
      />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoin: state.coins.activeCoin,
    activeApp: state.coins.activeApp,
    activeSection: state.coins.activeSection,
    coinMenuFocused: state.coins.coinMenuFocused,
    selectedSubWallet:
      state.coinMenus.activeSubWallets[state.coins.activeCoin.id],
    allSubWallets: state.coinMenus.allSubWallets[state.coins.activeCoin.id] || [],
    services: state.services
  };
};

export default connect(mapStateToProps)(withNavigationFocus(CoinMenus));
