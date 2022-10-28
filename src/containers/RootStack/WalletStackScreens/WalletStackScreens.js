import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Home from '../../Home/Home';

const WalletStack = createStackNavigator();

const WalletStackScreens = props => {
  return (
    <WalletStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <WalletStack.Screen
        name="Wallets"
        component={Home}
        options={{
          title: "Wallets",
        }}
      />
    </WalletStack.Navigator>
  );
};

export default WalletStackScreens