/*
  This component's purpose is to display a tab bar of 
  all the different options for buying/selling crypto
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
//import SellCrypto from './SellCrypto/SellCrypto'
import BuyCrypto from './BuyCrypto/BuyCrypto'
import { Icon } from "react-native-elements"

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
        screen: "BuyCrypto"
      },
      {
        key: "sell-crypto",
        icon: "format-list-numbered",
        label: "Sell",
        barColor: '#EDAE49',
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "SellCrypto"
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
    <Icon size={24} color="white" name={icon} />
  )

  renderTab = ({ tab, isActive }) => (
    <FullTab
      isActive={isActive}
      key={tab.key ? tab.key : ''}
      label={tab.label ? tab.label : ''}
      renderIcon={this.renderIcon(tab.icon)}
    />
  )

  switchTab = (newTab) => {
    this.props.navigation.setParams({ title: newTab.label })
    this.setState({ activeTab: newTab })
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
          {this.state.activeTab.screen === "SellCrypto" ? <BuyCrypto navigation={this.props.navigation}/> :
          (this.state.activeTab.screen === "BuyCrypto" ? <BuyCrypto navigation={this.props.navigation}/> :
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

