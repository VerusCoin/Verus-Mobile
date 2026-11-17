import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import SeedIntro from './Forms/SeedIntro';
import ShieldedAddressSetup from './Forms/ShieldedAddressSetup';
import SeedWords from './Forms/SeedWords';
const CreateSeedStack = createStackNavigator();

export default function CreateSeedStackScreens({
  newSeed,
  ensureNewSeed,
  onComplete,
}) {
  return (
    <CreateSeedStack.Navigator>
      <CreateSeedStack.Screen
        name="SeedIntro"
        options={{
          headerShown: false,
        }}>
        {({navigation}) => (
          <SeedIntro
            navigation={navigation}
            ensureNewSeed={ensureNewSeed}
          />
        )}
      </CreateSeedStack.Screen>
      <CreateSeedStack.Screen
        name="SeedWords"
        options={{
          headerShown: false,
        }}>
        {({navigation, route}) => {
          const seed = route.params?.seed || newSeed;

          return seed ? (
            <SeedWords
              navigation={navigation}
              newSeed={seed}
              onComplete={() =>
                navigation.navigate('ShieldedAddressSetup', {seed})
              }
            />
          ) : (
            <SeedIntro
              navigation={navigation}
              ensureNewSeed={ensureNewSeed}
            />
          );
        }}
      </CreateSeedStack.Screen>
      <CreateSeedStack.Screen
        name="ShieldedAddressSetup"
        options={{
          headerShown: false,
        }}>
        {({navigation, route}) => {
          const seed = route.params?.seed || newSeed;

          return seed ? (
            <ShieldedAddressSetup
              navigation={navigation}
              onComplete={useSeedAsZ => onComplete(useSeedAsZ, seed)}
            />
          ) : (
            <SeedIntro
              navigation={navigation}
              ensureNewSeed={ensureNewSeed}
            />
          );
        }}
      </CreateSeedStack.Screen>
    </CreateSeedStack.Navigator>
  );
}
