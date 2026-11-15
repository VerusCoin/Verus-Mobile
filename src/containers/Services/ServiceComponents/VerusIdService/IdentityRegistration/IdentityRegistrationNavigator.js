import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import {defaultHeaderOptions} from '../../../../../utils/navigation/header';
import {IdentityRegistrationStart, IdentityRegistrationCreate, IdentityCommitmentReview, IdentityRegistrationReview, IdentityRegistrationProgress} from './RegistrationScreens';

const Stack = createStackNavigator();

// A modal would reuse SendModal's short payment flow, but commit/reveal must
// survive dismissal and block confirmation. A dedicated stack adds navigation
// structure while making each approval and resumable entry explicit.
// Routes contain public IDs only. Future deeplinks can open Start with coinId,
// or Progress with jobId, and must still pass both separate payment approvals.
export default function IdentityRegistrationNavigator() {
  const sessionKey = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  return (
    <Stack.Navigator key={sessionKey} screenOptions={props => ({
      ...defaultHeaderOptions(props),
      headerStyle: {backgroundColor: '#fff'},
      headerTitleStyle: {fontSize: 17, fontWeight: '600', color: '#172033'},
      headerTintColor: '#3165d4', headerShadowVisible: false, headerBackTitleVisible: false,
      headerRight: () => null,
    })}>
      <Stack.Screen name="IdentityRegistrationStart" component={IdentityRegistrationStart} options={{title: 'VerusID'}} />
      <Stack.Screen name="IdentityRegistrationCreate" component={IdentityRegistrationCreate} options={{title: 'New identity'}} />
      <Stack.Screen name="IdentityCommitmentReview" component={IdentityCommitmentReview} getId={({params}) => params?.jobId} options={{title: 'Commit name'}} />
      <Stack.Screen name="IdentityRegistrationProgress" component={IdentityRegistrationProgress} getId={({params}) => params?.jobId} options={{title: 'Progress'}} />
      <Stack.Screen name="IdentityRegistrationReview" component={IdentityRegistrationReview} getId={({params}) => params?.jobId} options={{title: 'Register identity'}} />
    </Stack.Navigator>
  );
}
