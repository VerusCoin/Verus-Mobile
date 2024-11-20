import React, {useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LoadingStackScreens from './LoadingStackScreens/LoadingStackScreens';
import SignedInStackScreens from './SignedInStackScreens/SignedInStackScreens';
import SignedOutStackScreens from './SignedOutStackScreens/SignedOutStackScreens';
import SignedOutNoKeyStackScreens from './SignedOutNoKeyStackScreens/SignedOutNoKeyStackScreens';
import DeepLinkStackScreens from './DeepLinkStackScreens/DeepLinkStackScreens';
import LoginRequestInfo from '../DeepLink/LoginRequestInfo/LoginRequestInfo';
import InvoiceInfo from '../DeepLink/InvoiceInfo/InvoiceInfo';
import Colors from '../../globals/colors';
import { SafeAreaView } from 'react-native';

const RootStack = createStackNavigator();

const RootStackScreens = props => {
  return (
    <RootStack.Navigator
      screenOptions={{
        mode: 'modal',
        headerShown: false,
      }}>
      {props.loading ? (
        <RootStack.Screen name="LoadingStack" component={LoadingStackScreens} />
      ) : props.hasAccount ? (
        props.signedIn ? (
          <RootStack.Screen name="SignedInStack" component={SignedInStackScreens} />
        ) : (
          <RootStack.Screen
            name="SignedOutStack"
            component={SignedOutStackScreens}
            options={{
              headerRight: () => null,
            }}
          />
        )
      ) : (
        <RootStack.Screen
          name="SignedOutNoKeyStack"
          component={SignedOutNoKeyStackScreens}
        />
      )}
      <RootStack.Screen
        name="DeepLink"
        component={DeepLinkStackScreens}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="LoginRequestInfo"
        component={LoginRequestInfo}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="InvoiceInfo"
        component={InvoiceInfo}
        options={{ headerShown: false }}
      />
    </RootStack.Navigator>
  );
};

export default RootStackScreens;
