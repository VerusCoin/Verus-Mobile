/*
  This component's purpose is to display a tab bar of
  all the different apps a specific coin has in the coinData file.
*/

import React, { Component } from "react";
import {
  View,
  Text
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
import Overview from './Overview/Overview'
import SendCoin from './SendCoin/SendCoin'
import ReceiveCoin from './ReceiveCoin/ReceiveCoin'
import { Icon } from "react-native-elements"
import VerusLightClient from 'react-native-verus-light-client';
import { setActiveSection, setCoinSubWallet, setIsCoinMenuFocused } from "../../actions/actionCreators";
import { NavigationActions, withNavigationFocus } from '@react-navigation/compat';
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import DynamicHeader from "./DynamicHeader";
import { truncateDecimal } from '../../utils/math'
import { Portal } from "react-native-paper";
import { API_GET_BALANCES } from "../../utils/constants/intervalConstants";
import { CONNECTION_ERROR } from "../../utils/api/errors/errorMessages";

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
      subWallets
    }; 

    if (subWallets.length == 1) props.dispatch(setCoinSubWallet(props.activeCoin.id, subWallets[0]))
  }

  componentDidMount() {
    this.props.dispatch(setIsCoinMenuFocused(true))
  }

  componentDidUpdate(lastProps) {
    if (lastProps.isFocused !== this.props.isFocused) {
      this.props.dispatch(setIsCoinMenuFocused(this.props.isFocused))
    }

    var testArray = ['VRSC', 'vrsc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99'];

    VerusLightClient.request( 0, "listprivatetransactions", testArray)
    .then(res => {
      console.log("Check Dit")
      console.log(res)
    })

  }

  generateTabs = () => {
    //this.props.activeSection
    let tabArray = []
    let activeTab;
    let options = this.props.activeCoin.apps[this.props.activeApp].data
    const screens = {
      //Overview: <Overview/>,
      //SendCoin: <SendCoin/>
      Overview: "Overview",
      SendCoin: "SendCoin",
      ReceiveCoin: "ReceiveCoin"
    }

    for (let i = 0; i < options.length; i++) {
      let _tab = {
        key: options[i].key,
        icon: options[i].icon,
        label: options[i].name,
        barColor: options[i].color,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: screens[options[i].screen],
        activeSection: options[i]
      }

      if (options[i].key === this.props.activeSection.key) {
        activeTab = _tab
      }

      tabArray.push(_tab)
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key)
    }

    this.props.navigation.setOptions({ title: activeTab.label })

    return {
      tabs: tabArray,
      activeTab: activeTab
    };
  }

  renderIcon = icon => ({ isActive }) => (
    <Icon size={24} color="white" name={icon} />
  )

  renderBalanceLabel = () => {
    const { activeCoin, balances } = this.props;
    let displayBalance =
      balances != null && balances.results != null
        ? balances.results.total
        : null;

    if (balances.errors) {
      return (
        <Text
          style={{ ...Styles.largeCentralPaddedHeader, ...Styles.errorText }}
        >
          {CONNECTION_ERROR}
        </Text>
      );
    } else {
      return (
        <Text style={Styles.largeCentralPaddedHeader}>
          {`${
            displayBalance != null
              ? truncateDecimal(displayBalance, 4)
              : "-"
          } ${activeCoin.id}`}
        </Text>
      );
    } 
  };

  renderTab = ({ tab, isActive }) => (
    <FullTab
      isActive={isActive}
      key={tab.key ? tab.key : ''}
      labelStyle={{fontFamily: 'Avenir-Black',paddingLeft: 5}}
      label={tab.label ? tab.label : ''}
      renderIcon={this.renderIcon(tab.icon)}
      style={{flexDirection: 'row', alignSelf: 'center', justifyContent: 'center'}}
    />
  )

  switchTab = (newTab) => {
    this.props.navigation.setOptions({ title: newTab.label })
    this.props.dispatch(setActiveSection(newTab.activeSection))
    this.setState({ activeTab: newTab })
  }

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  //The rendering of overview, send and recieve is temporary, we want to use
  //this.state.activeTab.screen, but the
  //"Cannot Add a child that doesn't have a YogaNode to a parent with out a measure function"
  //bug comes up and it seems like a bug in rn
  render() {
    const { selectedSubWallet } = this.props
    const { subWallets } = this.state
    //const DynamicHeaderPortal = <Portal.Host></Portal.Host>

    return (
      <Portal.Host>
        <View style={{ flex: 1 }}>
          {selectedSubWallet == null && (
            <SubWalletSelectorModal
              visible={selectedSubWallet == null}
              cancel={this.goBack}
              animationType="slide"
              subWallets={subWallets}
            />
          )}
          <View style={Styles.centralRow}>{this.renderBalanceLabel()}</View>
          {selectedSubWallet != null && <DynamicHeader />}
          {selectedSubWallet != null && (
            <React.Fragment>
              {this.state.activeTab.screen === "Overview" ? (
                <Overview
                  navigation={this.props.navigation}
                  data={this.passthrough}
                />
              ) : this.state.activeTab.screen === "SendCoin" ? (
                <SendCoin
                  navigation={this.props.navigation}
                  data={this.passthrough}
                />
              ) : this.state.activeTab.screen === "ReceiveCoin" ? (
                <ReceiveCoin
                  navigation={this.props.navigation}
                  data={this.passthrough}
                />
              ) : null}
              <BottomNavigation
                onTabPress={(newTab) => this.switchTab(newTab)}
                renderTab={this.renderTab}
                tabs={this.state.tabs}
                activeTab={this.state.activeTab.key}
              />
            </React.Fragment>
          )}
        </View>
      </Portal.Host>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const channel =
    state.coinMenus.activeSubWallets[chainTicker] != null
      ? state.coinMenus.activeSubWallets[chainTicker].channel
      : null;

  return {
    activeCoin: state.coins.activeCoin,
    activeApp: state.coins.activeApp,
    activeSection: state.coins.activeSection,
    coinMenuFocused: state.coins.coinMenuFocused,
    selectedSubWallet: state.coinMenus.activeSubWallets[state.coins.activeCoin.id],
    allSubWallets: state.coinMenus.allSubWallets[state.coins.activeCoin.id],
    balances: {
      results: channel != null ? state.ledger.balances[channel][chainTicker] : null,
      errors: channel != null ? state.errors[API_GET_BALANCES][channel][chainTicker] : null,
    },
  }
};

export default connect(mapStateToProps)(withNavigationFocus(CoinMenus));
