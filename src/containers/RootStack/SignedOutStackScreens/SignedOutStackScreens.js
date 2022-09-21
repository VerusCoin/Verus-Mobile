import React, { useEffect } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import DisplaySeed from '../../Settings/ProfileSettings/DisplaySeed/DisplaySeed'
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed'
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile'
import SecureLoading from '../../SecureLoading/SecureLoading'
import Login from '../../Login/Login';
import SignUp from '../../SignUp/SignUp';
import { useSelector } from 'react-redux';

const SignedOutStack = createStackNavigator();

const SignedOutStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)

  useEffect(() => {
    if (deeplinkId != null) {
      props.navigation.navigate('DeepLink');
    }
  }, [deeplinkId]);

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