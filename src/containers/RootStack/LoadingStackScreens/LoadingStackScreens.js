import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import LoadingScreen from "../../LoadingScreen/LoadingScreen";

const LoadingStack = createStackNavigator();

const LoadingStackScreens = props => {
  return (
    <LoadingStack.Navigator>
      <LoadingStack.Screen
        name="Splash"
        component={LoadingScreen}
        options={{
          headerShown: false,
        }}
      />
    </LoadingStack.Navigator>
  );
};

export default LoadingStackScreens