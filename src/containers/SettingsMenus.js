import React, { Component } from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
import AppInfo from './AppInfo'
import ProfileSettings from './ProfileSettings'
import { Icon } from "react-native-elements"

class SettingsMenus extends Component {
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
        key: "settings-info",
        icon: "info",
        label: "App Info",
        barColor: '#2E86AB',
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "AppInfo"
      },
      /*{
        key: "settings-general",
        icon: "book",
        label: "General",
        barColor: "#EDAE49",
        pressColor: 'rgba(255, 255, 255, 0.16)',
      },*/
      {
        key: "settings-profile",
        icon: "account-circle",
        label: "Profile",
        barColor: '#009B72',
        pressColor: 'rgba(255, 255, 255, 0.16)',
        screen: "ProfileSettings"
      }
    ]
    let activeTab
    let index = 0

    while (index < tabArray.length && tabArray[index].key !== this.props.activeConfigSection) {
      index++
    }

    if (index < tabArray.length) {
      activeTab = tabArray[index]
    } else {
      throw "Tab not found for active section " + this.props.activeConfigSection
    }

    return {
      tabs: tabArray,
      activeTab: activeTab
    };
  }

  renderIcon = icon => ({ isActive }) => (
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
          {this.state.activeTab.screen === "AppInfo" ? <AppInfo navigation={this.props.navigation}/> :
          (this.state.activeTab.screen === "ProfileSettings" ? <ProfileSettings navigation={this.props.navigation}/> :
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
    activeConfigSection: state.settings.activeConfigSection
  }
};

export default connect(mapStateToProps)(SettingsMenus);

