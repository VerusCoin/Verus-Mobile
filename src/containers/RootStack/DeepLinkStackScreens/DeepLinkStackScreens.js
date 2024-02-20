import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import DeepLink from '../../DeepLink/DeepLink';
import LoginRequestIdentity from '../../DeepLink/LoginRequestIdentity/LoginRequestIdentity';
import LoginRequestComplete from '../../DeepLink/LoginRequestComplete/LoginRequestComplete';
import { useSelector } from 'react-redux';
import InvoicePaymentConfiguration from '../../DeepLink/InvoicePaymentConfiguration/InvoicePaymentConfiguration';

const DeepLinkStack = createStackNavigator();

const DeepLinkStackScreens = props => {
  const darkMode = useSelector(state=>state.settings.darkModeState)
  return (
    <DeepLinkStack.Navigator
      screenOptions={
        defaultHeaderOptions({darkMode})
      }
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
      <DeepLinkStack.Screen
        name="InvoicePaymentConfiguration"
        component={InvoicePaymentConfiguration}
        options={{
          headerRight: () => null,
          title: "Configure Payment"
        }}
      />
    </DeepLinkStack.Navigator>
  );
};

export default DeepLinkStackScreens