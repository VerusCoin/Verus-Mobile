import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import Home from '../../Home/Home';
import Service from '../../Services/Service/Service';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';
import CoinMenus from '../../Coin/CoinMenus';

const WalletStack = createStackNavigator();

const WalletStackScreens = props => {
  const theme = useOnboardingTheme();

  return (
    <WalletStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}
    >
      <WalletStack.Screen
        name="Wallets"
        component={Home}
        options={{
          title: "Wallet",
          headerShown: false,
        }}
      />
      <WalletStack.Screen
        name="Service"
        component={Service}
      />
      <WalletStack.Screen
        name="CoinMenus"
        component={CoinMenus}
        options={{title: '', headerShadowVisible: false}}
      />
    </WalletStack.Navigator>
  );
};

export default WalletStackScreens
