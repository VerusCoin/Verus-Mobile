import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import SeedIntro from './Forms/SeedIntro';
import SeedWords from './Forms/SeedWords';
const CreateSeedStack = createStackNavigator();

export default function CreateSeedStackScreens({ navigation, newSeed, onComplete, testProfile }) {
  return (
    <CreateSeedStack.Navigator>
      <CreateSeedStack.Screen
        name="SeedIntro"
        options={{
          headerShown: false,
        }}>
        {() => (
          <SeedIntro
            navigation={navigation}
          />
        )}
      </CreateSeedStack.Screen>
      <CreateSeedStack.Screen
        name="SeedWords"
        options={{
          headerShown: false,
        }}>
        {() => (
          <SeedWords
            navigation={navigation}
            newSeed={newSeed}
            onComplete={onComplete}
            testProfile={testProfile}
          />
        )}
      </CreateSeedStack.Screen>
    </CreateSeedStack.Navigator>
  );
}
