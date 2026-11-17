import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import {IdentityManagementProvider} from './IdentityManagementContext';
import {IdentityModify, IdentityTransfer, IdentityUpdateReview, IdentityUpdateResult} from './IdentityManagementScreens';

const Stack = createStackNavigator();

export default function IdentityManagementNavigator() {
  const sessionKey = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  return <IdentityManagementProvider key={sessionKey}>
    <Stack.Navigator screenOptions={{headerShown: false, gestureEnabled: false}}>
      <Stack.Screen name="IdentityModify" component={IdentityModify} options={{title: 'Modify VerusID'}} />
      <Stack.Screen name="IdentityTransfer" component={IdentityTransfer} options={{title: 'Transfer VerusID'}} />
      <Stack.Screen name="IdentityUpdateReview" component={IdentityUpdateReview} options={{title: 'Review changes'}} />
      <Stack.Screen name="IdentityUpdateResult" component={IdentityUpdateResult} options={{title: 'VerusID update', headerLeft: () => null, gestureEnabled: false}} />
    </Stack.Navigator>
  </IdentityManagementProvider>;
}
