import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Convert from '../../Convert/Convert';

const ConvertStack = createStackNavigator();

const ConvertStackScreens = props => {
  return (
    <ConvertStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <ConvertStack.Screen
        name="ConvertHome"
        component={Convert}
        options={{
          title: "Convert"
        }}
      />
    </ConvertStack.Navigator>
  );
};

export default ConvertStackScreens