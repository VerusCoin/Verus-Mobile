import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import DeepLink from '../../DeepLink/DeepLink';

const DeepLinkStack = createStackNavigator();

const DeepLinkStackScreens = props => {
  return (
    <DeepLinkStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <DeepLinkStack.Screen
        name="VerifyDeepLink"
        component={DeepLink}
        options={{
          headerShown: false
        }}
      />
    </DeepLinkStack.Navigator>
  );
};

export default DeepLinkStackScreens