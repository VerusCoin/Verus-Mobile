/*
  This component's purpose is to display a tab bar of 
  all the different options a specific setting type has 
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import AppInfo from './AppInfo/AppInfo'
import ProfileSettings from './ProfileSettings/ProfileSettings'
import WalletSettings from './WalletSettings/WalletSettings'
import { BottomNavigation } from "react-native-paper"

class SettingsMenus extends Component {
  constructor(props) {
    super(props)
    let stateObj = this.generateTabs();
    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
      activeTabIndex: stateObj.activeTabIndex
    };

    this.Routes = {
      ['settings-profile']: ProfileSettings,
      ['settings-wallet']: WalletSettings,
      ['settings-info']: AppInfo
    }
  }

  static navigationOptions = ({ route }) => {
    return {
      title: typeof(route.params)==='undefined' || 
      typeof(route.params.title) === 'undefined' ? 
      'undefined': route.params.title,
    };
  };

  generateTabs = () => {
    let tabArray = [
      {
        key: "settings-profile",
        focusedIcon: "account-settings",
        unfocusedIcon: "account-settings",
        title: "Profile",
        screen: "ProfileSettings"
      },
      {
        key: "settings-wallet",
        focusedIcon: "credit-card-settings",
        unfocusedIcon: "account-settings",
        title: "Wallet",
        screen: "WalletSettings"
      },
      {
        key: "settings-info",
        focusedIcon: "information",
        unfocusedIcon: "account-settings",
        title: "App Info",
        screen: "AppInfo"
      },
    ]
    let activeTab
    let activeTabIndex
    let index = 0

    while (index < tabArray.length && tabArray[index].key !== this.props.activeConfigSection) {
      index++
    }

    if (index < tabArray.length) {
      activeTab = tabArray[index]
      activeTabIndex = index
    } else {
      throw new Error("Tab not found for active section " + this.props.activeConfigSection)
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
        />
      );
    }
  }

  switchTab = (index) => {
    const newTab = this.state.tabs[index]

    this.props.navigation.setOptions({ title: newTab.title })
    this.setState({ activeTab: newTab, activeTabIndex: index })
  }

  render() {
    return (
      <BottomNavigation
        navigationState={{
          index: this.state.activeTabIndex,
          routes: this.state.tabs,
        }}
        onIndexChange={this.switchTab}
        renderScene={this.renderScene}
        style={{ display: 'flex' }}
      />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeConfigSection: state.settings.activeConfigSection
  }
};

export default connect(mapStateToProps)(SettingsMenus);

