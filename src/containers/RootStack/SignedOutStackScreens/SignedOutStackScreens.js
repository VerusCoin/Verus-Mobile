import React, {useEffect, useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import DisplaySeed from '../../DisplaySeed/DisplaySeed';
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed';
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile';
import SecureLoading from '../../SecureLoading/SecureLoading';
import Login from '../../Login/Login';
import SignUp from '../../SignUp/SignUp';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {setDeeplinkUrl} from '../../../actions/actionCreators';
import CreateProfile from '../../Onboard/CreateProfile/CreateProfile';
import RevokeRecoverStackScreens from '../RevokeRecoverStackScreens/RevokeRecoverStackScreens';
import RecoverSeedsStackScreens from '../RecoverSeedsStackScreens/RecoverSeedsStackScreens';
import ProvisioningDeeplinkList from '../../ProvisioningDeeplinkList/ProvisioningDeeplinkList';

const SignedOutStack = createStackNavigator();

const SignedOutStackScreens = props => {
  const deeplinkId = useSelector(state => state.deeplink.id);
  const deeplinkUrl = useSelector(state => state.deeplink.url);
  const parsingUrl = useSelector(state => state.deeplink.parsingUrl);
  const requestId = useSelector(state => state.deeplink.requestId);
  const store = useStore();
  const dispatch = useDispatch();

  useEffect(() => {
    // A newer URL or close can arrive between this render and its effect.
    const current = store.getState().deeplink;
    if (deeplinkId != null && deeplinkUrl != null && !parsingUrl &&
        current.requestId === requestId && current.url === deeplinkUrl && !current.parsingUrl) {
      dispatch(setDeeplinkUrl(null));
      props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    }
  }, [deeplinkId, deeplinkUrl, parsingUrl, requestId, store]);

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

      <SignedOutStack.Screen
        name="CreateProfile"
        component={CreateProfile}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="RevokeRecover"
        component={RevokeRecoverStackScreens}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="RecoverSeeds"
        component={RecoverSeedsStackScreens}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="ProvisioningDeeplinks"
        component={ProvisioningDeeplinkList}
        options={{
          title: 'Pending Requests',
        }}
      />
    </SignedOutStack.Navigator>
  );
};

export default SignedOutStackScreens;
