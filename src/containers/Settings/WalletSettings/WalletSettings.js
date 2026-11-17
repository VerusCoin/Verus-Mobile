/*
  This component displays the different coin setting menu options a user
  has. This includes general coin settings and specific settings for each 
  active coin.
*/

import React, {useCallback} from 'react';
import { connect } from 'react-redux';
import { ELECTRUM } from "../../../utils/constants/intervalConstants";
import { RenderSquareCoinLogo } from "../../../utils/CoinData/Graphics";
import ClearCacheSettingRow from '../components/ClearCacheSettingRow';
import KeychainEncryptionSettingRow from '../components/KeychainEncryptionSettingRow';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../components/SettingsScaffold';

const GENERAL_WALLET_SETTINGS = "GeneralWalletSettings"
const COIN_SETTINGS = "CoinSettings"
const VRPC_OVERRIDES = "VrpcOverrides"

const WalletSettings = ({ navigation, activeCoinsForUser }) => {
  const openSettings = useCallback((screen, data, header) => {
    navigation.navigate(screen, {
      data: data,
      title: header ? header : undefined,
    });
  }, [navigation]);

  const electrumCoins = activeCoinsForUser.filter(coin =>
    coin.compatible_channels.includes(ELECTRUM),
  );

  return (
    <SettingsScreen testID="settings.wallet">
      <SettingsSection title="Preferences">
        <SettingsRow
          description="Currency, display and requests"
          icon="tune"
          onPress={() => openSettings(GENERAL_WALLET_SETTINGS)}
          title="General settings"
        />
        <SettingsRow
          icon="server"
          last
          onPress={() => openSettings(VRPC_OVERRIDES)}
          title="Custom RPC servers"
        />
      </SettingsSection>
      <SettingsSection title="Storage & encryption">
        <ClearCacheSettingRow navigation={navigation} />
        <KeychainEncryptionSettingRow last navigation={navigation} />
      </SettingsSection>
      {electrumCoins.length > 0 ? (
        <SettingsSection title="Electrum coin settings">
          {electrumCoins.map((coin, index) => (
            <SettingsRow
              description="Transaction verification"
              key={coin.id}
              last={index === electrumCoins.length - 1}
              leading={RenderSquareCoinLogo(coin.id)}
              onPress={() =>
                openSettings(COIN_SETTINGS, coin.id, coin.display_name)
              }
              title={`${coin.display_name} settings`}
            />
          ))}
        </SettingsSection>
      ) : null}
    </SettingsScreen>
  );
};

const mapStateToProps = (state) => ({
  activeAccount: state.authentication.activeAccount,
  activeCoinsForUser: state.coins.activeCoinsForUser,
});

export default connect(mapStateToProps)(WalletSettings);
