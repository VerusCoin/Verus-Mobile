/*
  This component's purpose is to display a tab bar of 
  all the different apps a specific coin has in the coinData file. 
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import BottomNavigation, {
  FullTab
} from 'react-native-material-bottom-navigation'
import Overview from './Overview/Overview'
import SendCoin from './SendCoin/SendCoin'
import ReceiveCoin from './ReceiveCoin/ReceiveCoin'
import { Icon } from "react-native-elements"

class CoinMenus extends Component {
  constructor(props) {
    super(props)
    let stateObj = this.generateTabs();

    //CoinMenus can be passed data, which will be passed to 
    //the app section components as props
    this.passthrough = this.props.navigation.state.params ? this.props.navigation.state.params.data : null
    
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
        screen: screens[options[i].screen]
      }

      if (options[i].key === this.props.activeSection.key) {
        activeTab = _tab
      }

      tabArray.push(_tab)
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key)
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
      labelStyle={{fontFamily: 'Avenir-Black',paddingLeft: 5}}
      label={tab.label ? tab.label : ''}
      renderIcon={this.renderIcon(tab.icon)}
      style={{flexDirection: 'row', alignSelf: 'center', justifyContent: 'center'}}
    />
  )

  switchTab = (newTab) => {
    this.props.navigation.setParams({ title: newTab.label })
    this.setState({ activeTab: newTab })
  }

  //The rendering of overview, send and recieve is temporary, we want to use
  //this.state.activeTab.screen, but the 
  //"Cannot Add a child that doesn't have a YogaNode to a parent with out a measure function"
  //bug comes up and it seems like a bug in rn
  render() {
    return (
      <View style={{ flex: 1 }}>
          {this.state.activeTab.screen === "Overview" ? <Overview navigation={this.props.navigation} data={this.passthrough}/> :
          (this.state.activeTab.screen === "SendCoin" ? <SendCoin navigation={this.props.navigation} data={this.passthrough}/> : 
          (this.state.activeTab.screen === "ReceiveCoin" ? <ReceiveCoin navigation={this.props.navigation} data={this.passthrough}/> : null))}
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
    activeCoin: state.coins.activeCoin,
    activeApp: state.coins.activeApp,
    activeSection: state.coins.activeSection
  }
};

export default connect(mapStateToProps)(CoinMenus);

