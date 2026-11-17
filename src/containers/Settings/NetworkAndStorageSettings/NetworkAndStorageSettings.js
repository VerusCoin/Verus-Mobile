import React, {useCallback} from 'react';
import {connect} from 'react-redux';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import ClearCacheSettingRow from '../components/ClearCacheSettingRow';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../components/SettingsScaffold';

const COIN_SETTINGS = 'CoinSettings';
const VRPC_OVERRIDES = 'VrpcOverrides';
const ASSET_LEADING_STYLE = {marginRight: 18};

const NetworkAndStorageSettings = ({activeCoinsForUser, navigation}) => {
  const openSettings = useCallback(
    (screen, data, title) => {
      navigation.navigate(screen, {
        data,
        title,
      });
    },
    [navigation],
  );

  const electrumCoins = activeCoinsForUser.filter(coin =>
    coin.compatible_channels.includes(ELECTRUM),
  );

  return (
    <SettingsScreen testID="settings.networkAndStorage">
      <SettingsSection title="Network">
        <SettingsRow
          icon="server"
          last
          onPress={() => openSettings(VRPC_OVERRIDES)}
          title="Custom RPC servers"
        />
      </SettingsSection>
      <SettingsSection title="Storage">
        <ClearCacheSettingRow last navigation={navigation} />
      </SettingsSection>
      {electrumCoins.length > 0 ? (
        <SettingsSection title="Coin settings">
          {electrumCoins.map((coin, index) => (
            <SettingsRow
              description="Transaction verification"
              key={coin.id}
              last={index === electrumCoins.length - 1}
              leading={<AssetCoinLogo coinId={coin.id} />}
              leadingStyle={ASSET_LEADING_STYLE}
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

const mapStateToProps = state => ({
  activeCoinsForUser: state.coins.activeCoinsForUser,
});

export default connect(mapStateToProps)(NetworkAndStorageSettings);
