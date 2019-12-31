/*
  This component's purpose is to display a tab bar of 
  all the different options for adding a custom coin
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
import CustomChainForm from './CustomChainForm/CustomChainForm'
import CustomChainScan from './CustomChainScan/CustomChainScan'
import { Icon } from "react-native-elements"
import Colors from '../../globals/colors';

class CustomChainMenus extends Component {
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
        key: "custom-coin-qr",
        icon: "photo-camera",
        label: "Scan QR",
        barColor: Colors.primaryColor,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "CustomChainScan"
      },
      {
        key: "custom-coin-form",
        icon: "format-list-numbered",
        label: "Coin Form",
        barColor: Colors.infoButtonColor,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "CustomChainForm"
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
      labelStyle={{fontFamily: 'Avenir-Black',paddingLeft: 5}}
      renderIcon={this.renderIcon(tab.icon)}
      style={{flexDirection: 'row', alignSelf: 'center', justifyContent: 'center'}}
    />
  )

  switchTab = (newTab) => {
    this.props.navigation.setParams({ title: newTab.label })
    this.setState({ activeTab: newTab })
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
          {this.state.activeTab.screen === "CustomChainForm" ? <CustomChainForm navigation={this.props.navigation}/> :
          (this.state.activeTab.screen === "CustomChainScan" ? <CustomChainScan navigation={this.props.navigation}/> :
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
    activeSection: state.customCoins.activeSection
  }
};

export default connect(mapStateToProps)(CustomChainMenus);

