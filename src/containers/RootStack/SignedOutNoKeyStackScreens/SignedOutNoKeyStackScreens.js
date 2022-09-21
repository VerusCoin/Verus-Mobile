import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import SignUp from '../../SignUp/SignUp';

const SignedOutNoKeyStack = createStackNavigator();

const SignedOutNoKeyStackScreens = props => {
  return (
    <SignedOutNoKeyStack.Navigator>
      <SignedOutStack.Screen
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