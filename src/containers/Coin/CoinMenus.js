/*
  This component's purpose is to display a tab bar of 
  all the different apps a specific coin has in the coinData file. 
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import Overview from './Overview/Overview'
import SendCoin from './SendCoin/SendCoin'
import ReceiveCoin from './ReceiveCoin/ReceiveCoin'
import ConvertCoin from "./ConvertCoin/ConvertCoin";
import ManageCoin from "./ManageCoin/ManageCoin";
import { setActiveSection, setCoinSubWallet, setIsCoinMenuFocused } from "../../actions/actionCreators";
import { NavigationActions, withNavigationFocus } from '@react-navigation/compat';
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import DynamicHeader from "./DynamicHeader";
import { Portal, BottomNavigation } from "react-native-paper";
import { subWalletActivity } from "../../utils/subwallet/subWalletStatus";
import MissingInfoRedirect from "../../components/MissingInfoRedirect/MissingInfoRedirect";
import { WALLET_APP_CONVERT, WALLET_APP_MANAGE, WALLET_APP_OVERVIEW, WALLET_APP_RECEIVE, WALLET_APP_SEND } from "../../utils/constants/apps";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";

class CoinMenus extends Component {
  constructor(props) {
    super(props);
    let stateObj = this.generateTabs();
    const subWallets = props.allSubWallets;

    //CoinMenus can be passed data, which will be passed to
    //the app section components as props
    this.passthrough = this.props.route.params ? this.props.route.params.data : null;

    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
      activeTabIndex: stateObj.activeTabIndex,
      subWallets,
      filteredSubWallets: null,
    };

    if (subWallets.length == 1)
      props.dispatch(setCoinSubWallet(props.activeCoin.id, subWallets[0]));

    this.Routes = {
      [WALLET_APP_OVERVIEW]: Overview,
      [WALLET_APP_SEND]: SendCoin,
      [WALLET_APP_RECEIVE]: ReceiveCoin,
      [WALLET_APP_CONVERT]: ConvertCoin,
      [WALLET_APP_MANAGE]: ManageCoin
    };
  }

  componentDidMount() {
    this.props.dispatch(setIsCoinMenuFocused(true));
  }

  componentDidUpdate(lastProps) {
    if (lastProps.isFocused !== this.props.isFocused) {
      this.props.dispatch(setIsCoinMenuFocused(this.props.isFocused));
    }

    if (
      lastProps.selectedSubWallet != this.props.selectedSubWallet &&
      this.state.filteredSubWallets != null &&
      this.props.selectedSubWallet != null
    ) {
      this.setState({
        filteredSubWallets: null,
      });
    }
  }

  generateTabs = () => {
    let tabArray = [];
    let activeTab;
    let activeTabIndex;
    let options = this.props.activeCoin.apps[this.props.activeApp].data;

    for (let i = 0; i < options.length; i++) {
      let _tab = {
        key: options[i].key,
        focusedIcon: options[i].icon,
        unfocusedIcon: options[i].icon,
        title: options[i].name,
        //color: options[i].color, // Disregarded for now
        activeSection: options[i],
      };

      if (options[i].key === this.props.activeSection.key) {
        activeTab = _tab;
        activeTabIndex = i;
      }

      tabArray.push(_tab);
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key);
    }

    this.props.navigation.setOptions({ title: activeTab.title });

    return {
      tabs: tabArray,
      activeTab: activeTab,
      activeTabIndex,
    };
  };

  goToServices() {
    this.props.navigation.navigate("Home", {
      screen: "ServicesHome",
      initial: false,
    });
  }

  renderScene = ({ route, jumpTo }) => {
    if (this.Routes[route.key] == null) return null;
    else {
      const Route = this.Routes[route.key];
      const { placeholder, active } = subWalletActivity(this.props.selectedSubWallet.id);

      return this.props.selectedSubWallet.compatible_apps.includes(route.key) ? (
        active(this.props.services) ? (
          <Route navigation={this.props.navigation} data={this.passthrough} jumpTo={jumpTo} />
        ) : (
          <MissingInfoRedirect
            icon={placeholder.icon}
            label={placeholder.label}
            buttonLabel="configure services"
            onPress={() => this.goToServices()}
          />
        )
      ) : (
        <MissingInfoRedirect
          icon={"power-plug-off"}
          label={`This tab isn't accesible from the ${
            this.props.selectedSubWallet.name
          } card.`}
          buttonLabel="Switch cards"
          onPress={() => this.findCompatibleSubwallet(route.key)}
        />
      );
    }
  };

  findCompatibleSubwallet = (tabKey) => {
    const subwalletsForTab = this.state.subWallets.filter((wallet) =>
      wallet.compatible_apps.includes(tabKey)
    );

    if (subwalletsForTab.length > 0) {
      this.setState(
        {
          filteredSubWallets: subwalletsForTab,
        },
        () => this.props.dispatch(setCoinSubWallet(this.props.activeCoin.id, null))
      );
    } else {
      createAlert("Error", "No compatible cards found.");
    }
  };

  switchTab = (index) => {
    const newTab = this.state.tabs[index];

    this.props.navigation.setOptions({ title: newTab.title });
    this.props.dispatch(setActiveSection(newTab.activeSection));
    this.setState({ activeTab: newTab, activeTabIndex: index });
  };

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  //The rendering of overview, send and receive is temporary, we want to use
  //this.state.activeTab.screen, but the
  //"Cannot Add a child that doesn't have a YogaNode to a parent with out a measure function"
  //bug comes up and it seems like a bug in rn
  render() {
    const { selectedSubWallet, activeCoin } = this.props;
    const { subWallets, filteredSubWallets } = this.state;

    return (
      <Portal.Host>
        <View style={{ flex: 1, display: "flex" }}>
          {selectedSubWallet == null && (
            <SubWalletSelectorModal
              visible={selectedSubWallet == null}
              cancel={this.goBack}
              animationType="slide"
              subWallets={filteredSubWallets == null ? subWallets : filteredSubWallets}
              chainTicker={activeCoin.id}
              displayTicker={activeCoin.display_ticker}
            />
          )}
          {selectedSubWallet != null && <DynamicHeader switchTab={this.switchTab} />}
          {selectedSubWallet != null && (
            <BottomNavigation
              shifting={false}
              navigationState={{
                index: this.state.activeTabIndex,
                routes: this.state.tabs,
              }}
              onIndexChange={this.switchTab}
              renderScene={this.renderScene}
            />
          )}
        </View>
      </Portal.Host>
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
    allSubWallets: state.coinMenus.allSubWallets[state.coins.activeCoin.id],
    services: state.services
  };
};

export default connect(mapStateToProps)(withNavigationFocus(CoinMenus));

