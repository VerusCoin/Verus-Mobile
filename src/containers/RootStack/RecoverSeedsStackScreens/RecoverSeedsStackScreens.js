import React, { useState } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import RecoverSeedsSelectAccount from '../../RecoverSeeds/RecoverSeedsSelectAccount';
import DisplaySeed from '../../DisplaySeed/DisplaySeed';

const RecoverSeedsStack = createStackNavigator();

const RecoverSeedsStackScreens = props => {
  return (
    <RecoverSeedsStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <RecoverSeedsStack.Screen
        name="RecoverSeedsSelectAccount"
        options={{
          headerShown: false,
        }}
      >
        {(_props) => (
          <RecoverSeedsSelectAccount
            navigation={_props.navigation}
          />
        )}
      </RecoverSeedsStack.Screen>

      <RecoverSeedsStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          headerShown: false,
        }}
      />
    </RecoverSeedsStack.Navigator>
  );
};

export default RecoverSeedsStackScreens;