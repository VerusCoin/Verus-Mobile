import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import CreateSeedStackScreens from './Forms/CreateSeed/CreateSeed';
import ImportWalletStackScreens from './Forms/ImportWallet/ImportWallet';
import WalletIntro from './Forms/WalletIntro';
const CreateWalletStack = createStackNavigator();

export default function CreateWalletStackScreens({ navigation, createProfile }) {
  const [newSeed, setNewSeed] = useState(null)
  const [testProfile, setTestProfile] = useState(false)
  const [importedSeed, setImportedSeed] = useState(null)

  const completeSeedSetup = (asNew, useSeedAsZ, importedSeedOverride) => {
    createProfile(
      asNew
        ? newSeed
        : (importedSeedOverride != null ? importedSeedOverride : importedSeed),
      testProfile,
      asNew && useSeedAsZ,
    )
  }

  return (
    <CreateWalletStack.Navigator>
      <CreateWalletStack.Screen
        name="WalletIntro"
        options={{
          headerShown: false,
        }}>
        {() => (
          <WalletIntro
            navigation={navigation}
            newSeed={newSeed}
            setNewSeed={setNewSeed}
            setTestProfile={setTestProfile}
            testProfile={testProfile}
          />
        )}
      </CreateWalletStack.Screen>
      <CreateWalletStack.Screen
        name="CreateSeed"
        options={{
          headerShown: false,
        }}>
        {() => (
          <CreateSeedStackScreens
            navigation={navigation}
            newSeed={newSeed}
            setNewSeed={setNewSeed}
            onComplete={(useSeedAsZ) => completeSeedSetup(true, useSeedAsZ)}
            testProfile={testProfile}
          />
        )}
      </CreateWalletStack.Screen>
      <CreateWalletStack.Screen
        name="ImportWallet"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportWalletStackScreens
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={(seed) => completeSeedSetup(false, false, seed)}
          />
        )}
      </CreateWalletStack.Screen>
    </CreateWalletStack.Navigator>
  );
}
