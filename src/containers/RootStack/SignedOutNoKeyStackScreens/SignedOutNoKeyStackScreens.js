import React, {useEffect} from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import SignUp from '../../SignUp/SignUp';
import LandingScreen from '../../Onboard/Welcome/LandingScreen';
import WelcomeSlider from '../../Onboard/Welcome/WelcomeSlider';
import CreateProfile from '../../Onboard/CreateProfile/CreateProfile';
import {useDispatch, useSelector} from 'react-redux';
import {setDeeplinkUrl} from '../../../actions/actionCreators';

const SignedOutNoKeyStack = createStackNavigator();

const SignedOutNoKeyStackScreens = props => {
  const deeplinkId = useSelector(state => state.deeplink.id);
  const deeplinkUrl = useSelector(state => state.deeplink.url);
  const dispatch = useDispatch();

  useEffect(() => {
    if (deeplinkId != null && deeplinkUrl != null) {
      dispatch(setDeeplinkUrl(null));
      props.navigation.navigate('DeepLink');
    }
  }, [deeplinkId, deeplinkUrl]);

  return (
    <SignedOutNoKeyStack.Navigator>
      <SignedOutNoKeyStack.Screen
        name="LandingScreen"
        component={LandingScreen}
        options={{
          headerShown: false,
        }}
      />
      <SignedOutNoKeyStack.Screen
        name="WelcomeSlider"
        component={WelcomeSlider}
        options={{
          headerShown: false,
        }}
      />
      <SignedOutNoKeyStack.Screen
        name="CreateProfile"
        component={CreateProfile}
        options={{
          headerShown: false,
        }}
      />
      <SignedOutNoKeyStack.Screen
        name="SignIn"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />
    </SignedOutNoKeyStack.Navigator>
  );
};

export default SignedOutNoKeyStackScreens
