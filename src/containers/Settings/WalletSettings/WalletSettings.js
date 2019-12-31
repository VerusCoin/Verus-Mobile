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
import { NavigationActions } from 'react-navigation';
import { clearCacheData } from '../../../actions/actionCreators';
import styles from './WalletSettings.styles';
import Colors from '../../../globals/colors';

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
    const resetAction = NavigationActions.reset({
      index: 0, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: route, params: {data: data} }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  renderSettingsList = () => {
    return (
      <ScrollView style={styles.coinList}>
        <TouchableOpacity onPress={() => this.clearCache()}>
          <ListItem                       
            title={<Text style={styles.coinItemLabel}>Clear Data Cache</Text>}
            leftIcon={{name: 'clear-all'}}
            rightIcon={{name: 'close'}}
            containerStyle={{ borderBottomWidth: 0 }} 
            chevron={false}
            chevronColor={Colors.quaternaryColor}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this._openSettings(GENERAL_WALLET_SETTINGS)}>
          <ListItem                       
            title={<Text style={styles.coinItemLabel}>{"General Settings"}</Text>}
            leftIcon={{name: 'settings-applications'}}
            containerStyle={{ borderBottomWidth: 0 }} 
            chevronColor={Colors.quaternaryColor}
          />
        </TouchableOpacity>
        {this.props.activeCoinsForUser.map((coin, index) => {
          return (
            <TouchableOpacity 
              onPress={() => this._openSettings(COIN_SETTINGS, coin.id, coin.name)}
              key={index}>
              <ListItem
                title={<Text style={styles.coinItemLabel}>{`${coin.name} Settings`}</Text>}
                avatar={coin.logo}
                roundAvatar
                containerStyle={{ borderBottomWidth: 0 }} 
                chevronColor={Colors.quaternaryColor}
              />
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  render() {
    return (
      <View style={styles.root}>
        <Text style={styles.fiatBalanceLabel}>
        {this.props.activeAccount.id.length < 15 ? 
          this.props.activeAccount.id : "My Account"}
        </Text>
        <Text style={styles.balanceSheetLabel}>{"Wallet Settings"}</Text>
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
