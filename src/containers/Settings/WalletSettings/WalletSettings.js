/*
  This component displays the different coin setting menu options a user
  has. This includes general coin settings and specific settings for each 
  active coin.
*/

import React, {Component} from 'react';
import {ListItem, colors} from 'react-native-elements';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import AlertAsync from 'react-native-alert-async';
import {connect} from 'react-redux';
import {CommonActions} from '@react-navigation/native';
import {clearCacheData} from '../../../actions/actionCreators';
import Styles from '../../../styles/index';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
import {CoinLogos} from '../../../utils/CoinData/CoinData';
import {Divider, List} from 'react-native-paper';
import {RenderSquareCoinLogo} from '../../../utils/CoinData/Graphics';
import Colors from '../../../globals/colors';

const GENERAL_WALLET_SETTINGS = 'GeneralWalletSettings';
const COIN_SETTINGS = 'CoinSettings';
const ADDRESS_BLOCKLIST = 'AddressBlocklist';

class WalletSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  _openSettings = (screen, data, header) => {
    let navigation = this.props.navigation;

    navigation.navigate(screen, {
      data: data,
      title: header ? header : undefined,
    });
  };

  clearCache = () => {
    this.canClearCache().then(res => {
      if (res) {
        let data = {
          task: () => {
            return clearCacheData(this.props.dispatch);
          },
          message: 'Clearing cache, please do not close Verus Mobile',
          route: 'Home',
          successMsg: 'Cache cleared successfully',
          errorMsg: 'Cache failed to clear',
        };
        this.resetToScreen('SecureLoading', data);
      }
    });
  };

  canClearCache = () => {
    return AlertAsync(
      'Confirm',
      'Are you sure you would like to clear the stored data cache? ' +
        '(This could impact performance temporarily but will not delete any account information)',
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
    );
  };

  resetToScreen = (route, data) => {
    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [{name: route, params: {data: data}}],
    });

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  renderSettingsList = () => {
    const electrumCoins = this.props.activeCoinsForUser.filter(coin =>
      coin.compatible_channels.includes(ELECTRUM),
    );
    return (
      <ScrollView
        style={[
          Styles.fullWidth,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        <List.Subheader
          style={{
            color: this.props.darkMode
              ? Colors.secondaryColor
              : Colors.verusDarkGray,
          }}>
          {'Wallet Settings'}
        </List.Subheader>
        <TouchableOpacity
          onPress={() => this._openSettings(GENERAL_WALLET_SETTINGS)}>
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Item
            title={'General Settings'}
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}
            left={props => (
              <List.Icon
                {...props}
                color={
                  this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray
                }
                icon={'card-bulleted-settings'}
              />
            )}
            right={props => (
              <List.Icon
                {...props}
                color={
                  this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray
                }
                icon={'chevron-right'}
              />
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this._openSettings(ADDRESS_BLOCKLIST)}>
          <List.Item
            title={'Address Blocklist'}
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}
            left={props => (
              <List.Icon
                {...props}
                color={
                  this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray
                }
                icon={'block-helper'}
              />
            )}
            right={props => (
              <List.Icon
                {...props}
                color={
                  this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray
                }
                icon={'chevron-right'}
              />
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
        </TouchableOpacity>
        <List.Subheader
          style={{
            color: this.props.darkMode
              ? Colors.secondaryColor
              : Colors.verusDarkGray,
          }}>
          {'Wallet Actions'}
        </List.Subheader>
        <TouchableOpacity onPress={() => this.clearCache()}>
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Item
            title={'Clear Cache'}
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}
            left={props => (
              <List.Icon
                {...props}
                color={
                  this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray
                }
                icon={'notification-clear-all'}
              />
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
        </TouchableOpacity>
        {electrumCoins.length > 0 && (
          <React.Fragment>
            <List.Subheader
              style={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}>
              {'Coin Settings'}
            </List.Subheader>
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
              }}
            />
          </React.Fragment>
        )}
        {electrumCoins.map((coin, index) => {
          return (
            <TouchableOpacity
              onPress={() =>
                this._openSettings(COIN_SETTINGS, coin.id, coin.display_name)
              }
              key={index}>
              <List.Item
                title={`${coin.display_name} Settings`}
                titleStyle={{
                  color: this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.verusDarkGray,
                }}
                left={props => (
                  <View {...props}>{RenderSquareCoinLogo(coin.id)}</View>
                )}
                right={props => (
                  <List.Icon
                    {...props}
                    color={
                      this.props.darkMode
                        ? Colors.secondaryColor
                        : Colors.verusDarkGray
                    }
                    icon={'chevron-right'}
                  />
                )}
              />
              <Divider
                style={{
                  backgroundColor: this.props.darkMode
                    ? Colors.secondaryColor
                    : Colors.ultraLightGrey,
                }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  render() {
    return <View style={Styles.defaultRoot}>{this.renderSettingsList()}</View>;
  }
}

const mapStateToProps = state => {
  return {
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(WalletSettings);
