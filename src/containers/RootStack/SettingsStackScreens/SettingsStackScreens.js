import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SignedInSettingsHome from '../../Settings/SignedInSettingsHome';
import ProfileSettings from '../../Settings/ProfileSettings/ProfileSettings';
import NetworkAndStorageSettings from '../../Settings/NetworkAndStorageSettings/NetworkAndStorageSettings';
import Appearance from '../../Settings/Appearance/Appearance';
import AppInfo from '../../Settings/AppInfo/AppInfo';
import GeneralWalletSettings from '../../Settings/WalletSettings/GeneralWalletSettings/GeneralWalletSettings';
import VrpcOverrides from '../../Settings/WalletSettings/VrpcOverrides/VrpcOverrides';
import CoinSettings from '../../Settings/WalletSettings/CoinSettings/CoinSettings';
import {createSettingsHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';
import signedInCopy from '../../../copy/signedIn';

const SettingsStack = createStackNavigator();

const SettingsStackScreens = () => {
  const theme = useOnboardingTheme();
  const settingsHeaderOptions = createSettingsHeaderOptions(theme);

  return (
    <SettingsStack.Navigator
      screenOptions={settingsHeaderOptions}>
      <SettingsStack.Screen
        name="Settings"
        component={SignedInSettingsHome}
        options={{headerShown: false}}
      />
      <SettingsStack.Screen
        name="ProfileSettings"
        component={ProfileSettings}
        options={{title: signedInCopy.settings.securityAndRecovery}}
      />
      <SettingsStack.Screen
        name="WalletSettings"
        component={NetworkAndStorageSettings}
        options={{title: signedInCopy.settings.networkAndStorage}}
      />
      <SettingsStack.Screen
        name="Appearance"
        component={Appearance}
        options={{title: 'Appearance'}}
      />
      <SettingsStack.Screen
        name="AppInfo"
        component={AppInfo}
        options={{title: 'App information'}}
      />
      <SettingsStack.Screen
        name="GeneralWalletSettings"
        component={GeneralWalletSettings}
        options={{title: signedInCopy.settings.general}}
      />
      <SettingsStack.Screen
        name="VrpcOverrides"
        component={VrpcOverrides}
        options={{title: 'Custom RPC servers'}}
      />
      <SettingsStack.Screen
        name="CoinSettings"
        component={CoinSettings}
        options={({route}) => ({
          title: route.params != null ? route.params.title : null,
        })}
      />
    </SettingsStack.Navigator>
  );
};

export default SettingsStackScreens;
