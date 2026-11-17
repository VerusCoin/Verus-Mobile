import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import {IdentityRegistrationCreate, IdentityCommitmentReview, IdentityRegistrationProgress} from './RegistrationScreens';
import {RegistrationExitContext} from './registrationNavigation';

const Stack = createStackNavigator();

// A modal would reuse SendModal's short payment flow, but commit/reveal must
// survive dismissal and block confirmation. A dedicated stack adds navigation
// structure while making each approval and resumable entry explicit.
// Routes contain public IDs only. Future deeplinks can open Create with coinId,
// or Progress with jobId, and must still pass both separate payment approvals.
export default function IdentityRegistrationNavigator({navigation, route}) {
  const sessionKey = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  return (
    <RegistrationExitContext.Provider value={() => {
      navigation.goBack();
      if (route.params?.originTab && route.params.originTab !== 'IdentityTab') navigation.getParent()?.navigate(route.params.originTab);
    }}>
    <Stack.Navigator key={sessionKey} screenOptions={{headerShown: false, gestureEnabled: false}}>
      <Stack.Screen name="IdentityRegistrationCreate" component={IdentityRegistrationCreate} options={{title: 'New VerusID'}} />
      <Stack.Screen name="IdentityCommitmentReview" component={IdentityCommitmentReview} getId={({params}) => params?.jobId} options={{title: 'Check details'}} />
      <Stack.Screen name="IdentityRegistrationProgress" component={IdentityRegistrationProgress} getId={({params}) => params?.jobId} options={{title: 'Progress'}} />
    </Stack.Navigator>
    </RegistrationExitContext.Provider>
  );
}
