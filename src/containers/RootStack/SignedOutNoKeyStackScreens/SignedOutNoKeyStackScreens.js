import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import SignUp from '../../SignUp/SignUp';
import LandingScreen from '../../Onboard/Welcome/LandingScreen';
import WelcomeSlider from '../../Onboard/Welcome/WelcomeSlider';
import CreateProfile from '../../Onboard/CreateProfile/CreateProfile';

const SignedOutNoKeyStack = createStackNavigator();

const SignedOutNoKeyStackScreens = props => {
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