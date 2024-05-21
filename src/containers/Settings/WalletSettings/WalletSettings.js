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
import { CoinLogos } from "../../../utils/CoinData/CoinData";
import { Divider, List } from "react-native-paper"
import { RenderSquareCoinLogo } from "../../../utils/CoinData/Graphics";

const GENERAL_WALLET_SETTINGS = "GeneralWalletSettings"
const COIN_SETTINGS = "CoinSettings"
const ADDRESS_BLOCKLIST = "AddressBlocklist"
const VRPC_OVERRIDES = "VrpcOverrides"

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
    const electrumCoins = this.props.activeCoinsForUser.filter((coin) => coin.compatible_channels.includes(ELECTRUM))
    return (
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{"Wallet Settings"}</List.Subheader>
        <TouchableOpacity
          onPress={() => this._openSettings(GENERAL_WALLET_SETTINGS)}
        >
          <Divider />
            <List.Item
              title={"General Settings"}
              left={(props) => (
                <List.Icon {...props} icon={"card-bulleted-settings"} />
              )}
              right={(props) => (
                <List.Icon {...props} icon={"chevron-right"} />
              )}
            />
          <Divider />
        </TouchableOpacity>
        {/* <TouchableOpacity
          onPress={() => this._openSettings(ADDRESS_BLOCKLIST)}
        >
            <List.Item
              title={"Address Blocklist"}
              left={(props) => (
                <List.Icon {...props} icon={"block-helper"} />
              )}
              right={(props) => (
                <List.Icon {...props} icon={"chevron-right"} />
              )}
            />
          <Divider />
        </TouchableOpacity> */}
        <TouchableOpacity
          onPress={() => this._openSettings(VRPC_OVERRIDES)}
        >
            <List.Item
              title={"Custom RPC Servers"}
              left={(props) => (
                <List.Icon {...props} icon={"server"} />
              )}
              right={(props) => (
                <List.Icon {...props} icon={"chevron-right"} />
              )}
            />
          <Divider />
        </TouchableOpacity>
        <List.Subheader>{"Wallet Actions"}</List.Subheader>
        <TouchableOpacity onPress={() => this.clearCache()}>
          <Divider />
            <List.Item
              title={"Clear Cache"}
              left={(props) => (
                <List.Icon {...props} icon={"notification-clear-all"} />
              )}
            />
          <Divider />
        </TouchableOpacity>
        {electrumCoins.length > 0 && (
          <React.Fragment>
            <List.Subheader>{"Electrum Coin Settings"}</List.Subheader>
            <Divider />
          </React.Fragment>
        )}
        {electrumCoins.map((coin, index) => {
          return (
            <TouchableOpacity
              onPress={() =>
                this._openSettings(
                  COIN_SETTINGS,
                  coin.id,
                  coin.display_name
                )
              }
              key={index}
            >
              <List.Item
                title={`${coin.display_name} Settings`}
                left={(props) => (
                  <View {...props}>
                    {RenderSquareCoinLogo(coin.id)}
                  </View>
                )}
                right={(props) => (
                  <List.Icon {...props} icon={"chevron-right"} />
                )}
              />
              <Divider />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
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
