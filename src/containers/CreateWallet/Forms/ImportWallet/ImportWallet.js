import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import ImportIntro from './Forms/ImportIntro';
import ImportNfc from './Forms/ImportNfc';
import ImportSeed from './Forms/ImportSeed';
import ImportText from './Forms/ImportText';
const ImportWalletStack = createStackNavigator();

export default function ImportWalletStackScreens({
  importedSeed,
  setImportedSeed,
  onComplete,
  label
}) {
  return (
    <ImportWalletStack.Navigator>
      <ImportWalletStack.Screen
        name="ImportIntro"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportIntro
            navigation={stackNavigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            label={label}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportText"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportText
            navigation={stackNavigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={onComplete}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ScanQr"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportText
            navigation={stackNavigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={onComplete}
            qr={true}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportSeed"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportSeed
            navigation={stackNavigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={onComplete}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportNfc"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportNfc
            navigation={stackNavigation}
            setImportedSeed={setImportedSeed}
            onComplete={onComplete}
          />
        )}
      </ImportWalletStack.Screen>
    </ImportWalletStack.Navigator>
  );
}
