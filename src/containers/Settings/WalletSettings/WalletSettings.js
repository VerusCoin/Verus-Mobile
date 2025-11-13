/*
  This component displays the different coin setting menu options a user
  has. This includes general coin settings and specific settings for each 
  active coin.
*/

import React, { useState, useCallback, useEffect } from "react";
import { ListItem } from "react-native-elements";
import { 
  View, 
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";
import AlertAsync from "react-native-alert-async";
import { connect } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { clearCacheData } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import { ELECTRUM } from "../../../utils/constants/intervalConstants";
import { Divider, List } from "react-native-paper"
import { RenderSquareCoinLogo } from "../../../utils/CoinData/Graphics";
import { SecureStorage } from "../../../utils/keychain/secureStore";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";

const GENERAL_WALLET_SETTINGS = "GeneralWalletSettings"
const COIN_SETTINGS = "CoinSettings"
const VRPC_OVERRIDES = "VrpcOverrides"

const WalletSettings = ({ navigation, dispatch, activeCoinsForUser }) => {
  const [usingKeychainEncryption, setUsingKeychainEncryption] = useState(SecureStorage.isEncrypted());

  const openSettings = useCallback((screen, data, header) => {
    navigation.navigate(screen, {
      data: data,
      title: header ? header : undefined,
    });
  }, [navigation]);

  const resetToScreen = useCallback((route, data) => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [
        { name: route, params: { data } },
      ],
    });

    navigation.closeDrawer();
    navigation.dispatch(resetAction);
  }, [navigation]);

  const canClearCache = useCallback(() => {
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
        { text: 'Yes', onPress: () => Promise.resolve(true) },
      ],
      { cancelable: false },
    )
  }, []);

  const clearCache = useCallback(() => {
    canClearCache().then(res => {
      if (res) {
        let data = {
          task: () => clearCacheData(dispatch),
          message: "Clearing cache, please do not close Verus Mobile",
          route: "Home",
          successMsg: "Cache cleared successfully",
          errorMsg: "Cache failed to clear",
        }
        resetToScreen("SecureLoading", data)
      }
    })
  }, [canClearCache, dispatch, resetToScreen]);

  const canToggleKeychainEncryption = useCallback(() => {
    return AlertAsync(
      'Confirm',
      usingKeychainEncryption ? "Keychain encryption is an extra layer of security that uses your device's native keychain to encrypt your wallet data in addition to your password. Disabling it is not recommended, only do so if it significantly degrades wallet startup performance. Would you like to disable keychain encryption?" : "Are you sure you would like to enable keychain encryption?",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => Promise.resolve(true) },
      ],
      { cancelable: false },
    )
  }, []);

  const toggleKeychainEncryption = useCallback(() => {
    canToggleKeychainEncryption().then(res => {
      if (res) {
        let data = {
          task: async () => {
            try {
              if (usingKeychainEncryption) {
                await SecureStorage.decryptAllStorage();

                if (SecureStorage.isEncrypted()) {
                  createAlert("Error", "Failed to disable keychain encryption")
                } else {
                  createAlert("Success", "Disabled keychain encryption")
                }
              } else {
                await SecureStorage.encryptAllStorage();

                if (!SecureStorage.isEncrypted()) {
                  createAlert("Error", "Failed to enable keychain encryption")
                } else {
                  createAlert("Success", "Enabled keychain encryption")
                }
              }
            } catch (e) {
              createAlert("Error", e.message)
            }
          },
          message: `${usingKeychainEncryption ? "Disabling" : "Enabling"} keychain encryption`,
          route: "Home",
          successMsg: `Keychain encryption ${usingKeychainEncryption ? "disabled" : "enabled"} successfully`,
          errorMsg: `Failed to ${usingKeychainEncryption ? "disable" : "enable"} keychain encryption`,
        }
        resetToScreen("SecureLoading", data)
      }
    })
  }, [canToggleKeychainEncryption, dispatch, resetToScreen]);

  const renderSettingsList = () => {
    const electrumCoins = activeCoinsForUser.filter((coin) => 
      coin.compatible_channels.includes(ELECTRUM)
    );

    return (
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{"Wallet Settings"}</List.Subheader>

        <TouchableOpacity onPress={() => openSettings(GENERAL_WALLET_SETTINGS)}>
          <Divider />
          <List.Item
            title={"General Settings"}
            left={(props) => <List.Icon {...props} icon={"card-bulleted-settings"} />}
            right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
          />
          <Divider />
        </TouchableOpacity>

        {/* Uncomment if needed */}
        {/* <TouchableOpacity onPress={() => openSettings(ADDRESS_BLOCKLIST)}>
          <List.Item
            title={"Address Blocklist"}
            left={(props) => <List.Icon {...props} icon={"block-helper"} />}
            right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
          />
          <Divider />
        </TouchableOpacity> */}

        <TouchableOpacity onPress={() => openSettings(VRPC_OVERRIDES)}>
          <List.Item
            title={"Custom RPC Servers"}
            left={(props) => <List.Icon {...props} icon={"server"} />}
            right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
          />
          <Divider />
        </TouchableOpacity>

        <List.Subheader>{"Wallet Actions"}</List.Subheader>
        <TouchableOpacity onPress={clearCache}>
          <Divider />
          <List.Item
            title={"Clear Cache"}
            left={(props) => <List.Icon {...props} icon={"notification-clear-all"} />}
          />
          <Divider />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleKeychainEncryption}>
          <Divider />
          <List.Item
            title={usingKeychainEncryption ? "Disable Keychain Encryption" : "Enable Keychain Encryption"}
            left={(props) => <List.Icon {...props} icon={"key"} />}
          />
          <Divider />
        </TouchableOpacity>

        {electrumCoins.length > 0 && (
          <>
            <List.Subheader>{"Electrum Coin Settings"}</List.Subheader>
            <Divider />
          </>
        )}

        {electrumCoins.map((coin, index) => (
          <TouchableOpacity
            onPress={() => openSettings(COIN_SETTINGS, coin.id, coin.display_name)}
            key={index}
          >
            <List.Item
              title={`${coin.display_name} Settings`}
              left={(props) => <View {...props}>{RenderSquareCoinLogo(coin.id)}</View>}
              right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
            />
            <Divider />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={Styles.defaultRoot}>
      {renderSettingsList()}
    </View>
  );
};

const mapStateToProps = (state) => ({
  activeAccount: state.authentication.activeAccount,
  activeCoinsForUser: state.coins.activeCoinsForUser,
});

export default connect(mapStateToProps)(WalletSettings);