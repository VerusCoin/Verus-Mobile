import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Home from '../../Home/Home';
import Service from '../../Services/Service/Service';
import { useSelector } from 'react-redux';

const WalletStack = createStackNavigator();

const WalletStackScreens = props => {
  const darkMode = useSelector(state=>state.settings.darkModeState)
  return (
    <WalletStack.Navigator
      screenOptions={ defaultHeaderOptions({darkMode})}
    >
      <WalletStack.Screen
        name="Wallets"
        component={Home}
        options={{
          title: "Wallets",
        }}
      />
      <WalletStack.Screen
        name="Service"
        component={Service}
      />
    </WalletStack.Navigator>
  );
};

export default WalletStackScreens