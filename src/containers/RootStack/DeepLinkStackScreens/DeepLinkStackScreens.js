import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import DeepLink from '../../DeepLink/DeepLink';
import LoginRequestIdentity from '../../DeepLink/LoginRequestIdentity/LoginRequestIdentity';
import LoginRequestComplete from '../../DeepLink/LoginRequestComplete/LoginRequestComplete';
import InvoicePaymentConfiguration from '../../DeepLink/InvoicePaymentConfiguration/InvoicePaymentConfiguration';
import PersonalSelectData from '../../DeepLink/PersonalSelectData/PersonalSelectData';
import ProfileStackScreens from '../ProfileStackScreens/ProfileStackScreens';
import LoginReceiveAttestation from '../../DeepLink/LoginReceiveAttestation/LoginReceiveAttestation';
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
      <DeepLinkStack.Screen
        name="InvoicePaymentConfiguration"
        component={InvoicePaymentConfiguration}
        options={{
          headerRight: () => null,
          title: "Configure Payment"
        }}
      />
      <DeepLinkStack.Screen
        name="PersonalSelectData"
        component={PersonalSelectData}
        options={{
          headerRight: () => null,
          title: "Personal Data"
        }}
      />
      <DeepLinkStack.Screen
        name="ProfileStackScreens"
        component={ProfileStackScreens}
        options={{ headerShown: false }}
      />
      <DeepLinkStack.Screen
        name="LoginReceiveAttestation"
        component={LoginReceiveAttestation}
        options={{
          headerRight: () => null,
          title: "Receive Attestation"
        }}
      />
    </DeepLinkStack.Navigator>
  );
};

export default DeepLinkStackScreens