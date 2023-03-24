import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import ImportIntro from './Forms/ImportIntro';
import ImportText from './Forms/ImportText';
const ImportWalletStack = createStackNavigator();

export default function ImportWalletStackScreens({
  navigation,
  importedSeed,
  setImportedSeed,
  onComplete,
}) {
  return (
    <ImportWalletStack.Navigator>
      <ImportWalletStack.Screen
        name="ImportIntro"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportIntro
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportText"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportText
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={onComplete}
          />
        )}
      </ImportWalletStack.Screen>
    </ImportWalletStack.Navigator>
  );
}
