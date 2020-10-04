/*
  This component displays the different coin setting menu options a user
  has. This includes general coin settings and specific settings for each 
  active coin.
*/

import React, { Component } from "react";
import { ListItem } from "react-native-elements";
import { 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView
} from "react-native";
import AlertAsync from "react-native-alert-async";
import { connect } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { clearCacheData } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import { ELECTRUM } from "../../../utils/constants/intervalConstants";

const GENERAL_WALLET_SETTINGS = "GeneralWalletSettings"
const COIN_SETTINGS = "CoinSettings"

class WalletSettings extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false
    };
  }

  _openSettings = (screen, data, header) => {
    let navigation = this.props.navigation  

    navigation.navigate(screen, {
      data: data,
      title: header ? header : undefined
    });
  }

  clearCache = () => {
    this.canClearCache()
    .then(res => {
      if (res) {
        let data = {
          task: () => {
            return clearCacheData(this.props.dispatch)
          },
          message: "Clearing cache, please do not close Verus Mobile",
          route: "Home",
          successMsg: "Cache cleared successfully",
          errorMsg: "Cache failed to clear"
        }
        this.resetToScreen("SecureLoading", data)
      }
    })
  }

  canClearCache = () => {
    return AlertAsync(
      'Confirm',
      "Are you sure you would like to clear the stored data cache? " + 
      "(This could impact performance temporarily but will not delete any account information)",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  resetToScreen = (route, data) => {
    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [
        { name: route, params: { data: data } },
      ],
    })

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  renderSettingsList = () => {
    return (
      <ScrollView style={Styles.wide}>
        <TouchableOpacity onPress={() => this.clearCache()}>
          <ListItem                       
            title="Clear Data Cache"
            titleStyle={Styles.listItemLeftTitleDefault}
            leftIcon={{name: 'clear-all'}}
            containerStyle={Styles.bottomlessListItemContainer} 
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this._openSettings(GENERAL_WALLET_SETTINGS)}>
          <ListItem                       
            title="General Settings"
            titleStyle={Styles.listItemLeftTitleDefault}
            leftIcon={{name: 'settings-applications'}}
            containerStyle={Styles.bottomlessListItemContainer} 
            chevron
          />
        </TouchableOpacity>
        {this.props.activeCoinsForUser.filter((coin) => coin.compatible_channels.includes(ELECTRUM)).map((coin, index) => {
          return (
            <TouchableOpacity 
              onPress={() => this._openSettings(COIN_SETTINGS, coin.id, coin.display_name)}
              key={index}>
              <ListItem
                title={`${coin.display_name} Settings`}
                titleStyle={Styles.listItemLeftTitleDefault}
                leftAvatar={{
                  source: coin.logo,
                  size: 25
                }}
                containerStyle={Styles.bottomlessListItemContainer} 
                chevron
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <Text style={Styles.largeCentralPaddedHeader}>
        {this.props.activeAccount.id.length < 15 ? 
          this.props.activeAccount.id : "My Account"}
        </Text>
        <Text style={Styles.greyStripeHeader}>{"Wallet Settings"}</Text>
        {this.renderSettingsList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
  }
};

export default connect(mapStateToProps)(WalletSettings);
