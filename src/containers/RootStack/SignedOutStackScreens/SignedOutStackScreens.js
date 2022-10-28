import React, { useEffect, useState } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import DisplaySeed from '../../Settings/ProfileSettings/DisplaySeed/DisplaySeed'
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed'
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile'
import SecureLoading from '../../SecureLoading/SecureLoading'
import Login from '../../Login/Login';
import SignUp from '../../SignUp/SignUp';
import { useDispatch, useSelector } from 'react-redux';
import { setDeeplinkUrl } from '../../../actions/actionCreators';

const SignedOutStack = createStackNavigator();

const SignedOutStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkUrl = useSelector((state) => state.deeplink.url)
  const dispatch = useDispatch()

  useEffect(() => {
    if (deeplinkId != null && deeplinkUrl != null) {    
      dispatch(setDeeplinkUrl(null))  
      props.navigation.navigate('DeepLink');
    }
  }, [deeplinkId, deeplinkUrl]);

  return (
    <SignedOutStack.Navigator>
      <SignedOutStack.Screen
        name="Login"
        component={Login}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="SignIn"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          title: 'Recover',
        }}
      />

      <SignedOutStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          title: 'Seed',
        }}
      />

      <SignedOutStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          title: 'Delete',
        }}
      />

      <SignedOutStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          title: 'Loading',
          headerRight: () => null,
          headerLeft: () => null,
          drawerLockMode: 'locked-closed',
        }}
      />
    </SignedOutStack.Navigator>
  );
};

export default SignedOutStackScreens