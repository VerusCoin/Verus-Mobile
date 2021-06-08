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
import { setActiveSection, setCoinSubWallet, setIsCoinMenuFocused } from "../../actions/actionCreators";
import { NavigationActions, withNavigationFocus } from '@react-navigation/compat';
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import DynamicHeader from "./DynamicHeader";
import { Portal, BottomNavigation } from "react-native-paper";

class CoinMenus extends Component {
  constructor(props) {
    super(props)
    let stateObj = this.generateTabs();
    const subWallets = props.allSubWallets

    //CoinMenus can be passed data, which will be passed to 
    //the app section components as props
    this.passthrough = this.props.route.params ? this.props.route.params.data : null
    
    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
      activeTabIndex: stateObj.activeTabIndex,
      subWallets
    }; 

    if (subWallets.length == 1) props.dispatch(setCoinSubWallet(props.activeCoin.id, subWallets[0]))

    this.Routes = {
      ['wallet-overview']: Overview,
      ['wallet-send']: SendCoin,
      ['wallet-receive']: ReceiveCoin
    }
  }

  componentDidMount() {
    this.props.dispatch(setIsCoinMenuFocused(true))
  }

  componentDidUpdate(lastProps) {  
    if (lastProps.isFocused !== this.props.isFocused) {
      this.props.dispatch(setIsCoinMenuFocused(this.props.isFocused))
    }
  }

  generateTabs = () => {
    let tabArray = []
    let activeTab;
    let activeTabIndex;
    let options = this.props.activeCoin.apps[this.props.activeApp].data

    for (let i = 0; i < options.length; i++) {
      let _tab = {
        key: options[i].key,
        icon: options[i].icon,
        title: options[i].name,
        //color: options[i].color, // Disregarded for now
        activeSection: options[i]
      }

      if (options[i].key === this.props.activeSection.key) {
        activeTab = _tab
        activeTabIndex = i
      }

      tabArray.push(_tab)
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key)
    }

    this.props.navigation.setOptions({ title: activeTab.title })

    return {
      tabs: tabArray,
      activeTab: activeTab,
      activeTabIndex
    };
  }

  renderScene = ({ route, jumpTo }) => {
    if (this.Routes[route.key] == null) return null
    else {
      const Route = this.Routes[route.key]

      return (
        <Route
          navigation={this.props.navigation}
          data={this.passthrough}
          switchTab={jumpTo}
        />
      );
    }
  }

  switchTab = (index) => {
    const newTab = this.state.tabs[index]

    this.props.navigation.setOptions({ title: newTab.title })
    this.props.dispatch(setActiveSection(newTab.activeSection))
    this.setState({ activeTab: newTab, activeTabIndex: index })
  }

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  //The rendering of overview, send and recieve is temporary, we want to use
  //this.state.activeTab.screen, but the 
  //"Cannot Add a child that doesn't have a YogaNode to a parent with out a measure function"
  //bug comes up and it seems like a bug in rn
  render() {
    const { selectedSubWallet, activeCoin } = this.props
    const { subWallets } = this.state

    return (
      <Portal.Host>
        <View style={{ flex: 1, display: "flex" }}>
          {selectedSubWallet == null && (
            <SubWalletSelectorModal
              visible={selectedSubWallet == null}
              cancel={this.goBack}
              animationType="slide"
              subWallets={subWallets}
              chainTicker={activeCoin.id}
            />
          )}
          {selectedSubWallet != null && <DynamicHeader />}
          {selectedSubWallet != null && (
            <BottomNavigation
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
  };
};

export default connect(mapStateToProps)(withNavigationFocus(CoinMenus));

