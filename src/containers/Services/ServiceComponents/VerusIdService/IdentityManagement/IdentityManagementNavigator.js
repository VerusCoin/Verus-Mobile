import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import {defaultHeaderOptions} from '../../../../../utils/navigation/header';
import {IdentityManagementProvider} from './IdentityManagementContext';
import {IdentityModify, IdentityTransfer, IdentityUpdateReview, IdentityUpdateResult} from './IdentityManagementScreens';

const Stack = createStackNavigator();

export default function IdentityManagementNavigator() {
  const sessionKey = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  return <IdentityManagementProvider key={sessionKey}>
    <Stack.Navigator screenOptions={props => ({
      ...defaultHeaderOptions(props),
      headerStyle: {backgroundColor: '#fff'},
      headerTitleStyle: {fontSize: 17, fontWeight: '600', color: '#172033'},
      headerTintColor: '#3165d4', headerShadowVisible: false, headerBackTitleVisible: false,
      headerRight: () => null,
    })}>
      <Stack.Screen name="IdentityModify" component={IdentityModify} options={{title: 'Modify identity'}} />
      <Stack.Screen name="IdentityTransfer" component={IdentityTransfer} options={{title: 'Transfer identity'}} />
      <Stack.Screen name="IdentityUpdateReview" component={IdentityUpdateReview} options={{title: 'Review changes'}} />
      <Stack.Screen name="IdentityUpdateResult" component={IdentityUpdateResult} options={{title: 'Identity update', headerLeft: () => null, gestureEnabled: false}} />
    </Stack.Navigator>
  </IdentityManagementProvider>;
}
