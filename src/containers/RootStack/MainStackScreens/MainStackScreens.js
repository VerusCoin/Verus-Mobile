import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import AddCoin from '../../AddCoin/AddCoin'
import CoinDetails from '../../CoinDetails/CoinDetails'
import DisplaySeed from '../../DisplaySeed/DisplaySeed'
import SettingsMenus from '../../Settings/SettingsMenus'
import CoinMenus from '../../Coin/CoinMenus'
import VerusPay from '../../VerusPay/VerusPay'
import ProfileInfo from '../../Settings/ProfileSettings/ProfileInfo/ProfileInfo'
import ResetPwd from '../../Settings/ProfileSettings/ResetPwd/ResetPwd'
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed'
import GeneralWalletSettings from '../../Settings/WalletSettings/GeneralWalletSettings/GeneralWalletSettings'
import CoinSettings from '../../Settings/WalletSettings/CoinSettings/CoinSettings'
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile'
import SecureLoading from '../../SecureLoading/SecureLoading'
import HomeTabScreens from '../HomeTabScreens/HomeTabScreens';
import AddressBlocklist from '../../Settings/WalletSettings/AddressBlocklist/AddressBlocklist';
import VrpcOverrides from '../../Settings/WalletSettings/VrpcOverrides/VrpcOverrides';

const MainStack = createStackNavigator();

const MainStackScreens = props => {
  return (
    <MainStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <MainStack.Screen
        name="Home"
        component={HomeTabScreens}
        options={{ headerShown: false }}
      />

      <MainStack.Screen
        name="AddCoin"
        component={AddCoin}
        options={{
          title: "Add Coin",
        }}
      />

      <MainStack.Screen
        name="CoinDetails"
        component={CoinDetails}
        options={{
          title: "Details",
        }}
      />

      <MainStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          title: "Seed",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen name="CoinMenus" component={CoinMenus} />

      <MainStack.Screen name="SettingsMenus" component={SettingsMenus} />

      <MainStack.Screen
        name="ProfileInfo"
        component={ProfileInfo}
        options={{
          title: "Info",
        }}
      />

      <MainStack.Screen
        name="ResetPwd"
        component={ResetPwd}
        options={{
          title: "Reset",
        }}
      />

      <MainStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          title: "Recover",
        }}
      />

      <MainStack.Screen
        name="GeneralWalletSettings"
        component={GeneralWalletSettings}
        options={{
          title: "General",
        }}
      />

      <MainStack.Screen
        name="AddressBlocklist"
        component={AddressBlocklist}
        options={{
          title: "Blocked Addresses",
        }}
      />

      <MainStack.Screen
        name="VrpcOverrides"
        component={VrpcOverrides}
        options={{
          title: "Custom RPC Servers",
        }}
      />  

      <MainStack.Screen
        name="CoinSettings"
        component={CoinSettings}
        options={({ route }) => ({
          title: route.params != null ? route.params.title : null,
        })}
      />

      <MainStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          title: "Delete",
        }}
      />

      <MainStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          title: "Loading",
          headerRight: () => null,
          headerLeft: () => null,
        }}
      />
    </MainStack.Navigator>
  );
};

export default MainStackScreens