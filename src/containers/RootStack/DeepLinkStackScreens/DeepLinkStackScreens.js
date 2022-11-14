import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import DeepLink from '../../DeepLink/DeepLink';
import LoginRequestIdentity from '../../DeepLink/LoginRequestIdentity/LoginRequestIdentity';
import LoginRequestComplete from '../../DeepLink/LoginRequestComplete/LoginRequestComplete';

const DeepLinkStack = createStackNavigator();

const DeepLinkStackScreens = props => {
  return (
    <DeepLinkStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <DeepLinkStack.Screen
        name="VerifyDeepLink"
        component={DeepLink}
        options={{
          headerShown: false
        }}
      />
      <DeepLinkStack.Screen
        name="LoginRequestIdentity"
        component={LoginRequestIdentity}
        options={{
          headerRight: () => null,
          title: "Select Identity"
        }}
      />
      <DeepLinkStack.Screen
        name="LoginRequestComplete"
        component={LoginRequestComplete}
        options={{
          headerShown: false
        }}
      />
    </DeepLinkStack.Navigator>
  );
};

export default DeepLinkStackScreens