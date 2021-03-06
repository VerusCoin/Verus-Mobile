/*
  This component's purpose is to display a tab bar of 
  all the different options a specific setting type has 
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
import AppInfo from './AppInfo/AppInfo'
import ProfileSettings from './ProfileSettings/ProfileSettings'
import WalletSettings from './WalletSettings/WalletSettings'
import { IconButton, Portal } from "react-native-paper"
import Colors from '../../globals/colors';

class SettingsMenus extends Component {
  constructor(props) {
    super(props)
    let stateObj = this.generateTabs();
    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
    };
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
        icon: "account-settings",
        label: "Profile",
        barColor: Colors.primaryColor,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "ProfileSettings"
      },
      {
        key: "settings-wallet",
        icon: "credit-card-settings",
        label: "Wallet",
        barColor: Colors.infoButtonColor,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "WalletSettings"
      },
      {
        key: "settings-info",
        icon: "information",
        label: "App Info",
        barColor: Colors.successButtonColor,
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "AppInfo"
      },
    ]
    let activeTab
    let index = 0

    while (index < tabArray.length && tabArray[index].key !== this.props.activeConfigSection) {
      index++
    }

    if (index < tabArray.length) {
      activeTab = tabArray[index]
    } else {
      throw new Error("Tab not found for active section " + this.props.activeConfigSection)
    }

    this.props.navigation.setOptions({ title: activeTab.label })

    return {
      tabs: tabArray,
      activeTab: activeTab
    };
  }

  renderIcon = icon => ({ isActive }) => (
    <IconButton style={{ padding: 0, margin: 0 }} color="white" size={16} icon={icon} />
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
    this.props.navigation.setOptions({ title: newTab.label })
    this.setState({ activeTab: newTab })
  }

  render() {
    return (
        <View style={{ flex: 1 }}>
            {this.state.activeTab.screen === "AppInfo" ? <AppInfo navigation={this.props.navigation}/> :
            this.state.activeTab.screen === "ProfileSettings" ? <ProfileSettings navigation={this.props.navigation}/> :
            (this.state.activeTab.screen === "WalletSettings" ? <WalletSettings navigation={this.props.navigation}/> :
            null)}
          <BottomNavigation
            onTabPress={newTab => this.switchTab(newTab)}
            renderTab={this.renderTab}
            tabs={this.state.tabs}
            activeTab={this.state.activeTab.key}
            style={{ display: 'flex' }}
          />
        </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeConfigSection: state.settings.activeConfigSection
  }
};

export default connect(mapStateToProps)(SettingsMenus);

