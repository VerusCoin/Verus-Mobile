/*
  This component's purpose is to display a tab bar of
  all the different options for buying/selling crypto
*/

import React, { Component } from "react";
import {
  View,
  Image,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
//import SellCrypto from './SellCrypto/SellCrypto'
import BuyCrypto from './BuyCrypto/BuyCrypto'
import { Icon } from "react-native-elements"

import { Buy, Sell } from '../../images/customIcons';

class BuySellCryptoMenus extends Component {
  constructor(props) {
    super(props)
    let stateObj = this.generateTabs();
    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
    };
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: typeof(navigation.state.params)==='undefined' ||
      typeof(navigation.state.params.title) === 'undefined' ?
      'undefined': navigation.state.params.title,
    };
  };

  generateTabs = () => {
    let tabArray = [
      {
        key: "buy-crypto",
        icon: "photo-camera",
        label: "Buy",
        barColor: '#2E86AB',
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "BuyCrypto",
        source: Buy
      },
      {
        key: "sell-crypto",
        icon: "format-list-numbered",
        label: "Sell",
        barColor: '#EDAE49',
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "SellCrypto",
        source: Sell
      },
    ]
    let activeTab
    let index = 0

    while (index < tabArray.length && tabArray[index].key !== this.props.activeSection) {
      index++
    }

    if (index < tabArray.length) {
      activeTab = tabArray[index]
    } else {
      throw new Error("Tab not found for active section " + this.props.activeSection)
    }

    return {
      tabs: tabArray,
      activeTab: activeTab
    };
  }

  renderIcon = icon => () => (
    <Image source={icon} style={{
      flex: 1,
      width: 40,
      height: 40,
      resizeMode: 'contain',
      marginRight: 10,
    }}/>
  )

  renderTab = ({ tab, isActive }) => (
    <FullTab
      style={{flex:1, flexDirection: 'row', justifyContent:'center' }}
      isActive={isActive}
      key={tab.key ? tab.key : ''}
      label={tab.label ? tab.label : ''}
      renderIcon={this.renderIcon(tab.source)}
    />
  )

  switchTab = (newTab) => {
    this.props.navigation.setParams({ title: newTab.label })
    this.setState({ activeTab: newTab })
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
          {this.state.activeTab.screen === "SellCrypto" ? <BuyCrypto navigation={this.props.navigation}  /> :
          (this.state.activeTab.screen === "BuyCrypto" ? <BuyCrypto navigation={this.props.navigation}  buy/> :
          null)}
        <BottomNavigation
          onTabPress={newTab => this.switchTab(newTab)}
          renderTab={this.renderTab}
          tabs={this.state.tabs}
          activeTab={this.state.activeTab.key}
        />
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeSection: state.buySellCrypto.activeSection
  }
};

export default connect(mapStateToProps)(BuySellCryptoMenus);
