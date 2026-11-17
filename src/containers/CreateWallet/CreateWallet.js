import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import {createAlert} from '../../actions/actions/alert/dispatchers/alert';
import CreateSeedStackScreens from './Forms/CreateSeed/CreateSeed';
import ImportWalletStackScreens from './Forms/ImportWallet/ImportWallet';
import WalletIntro from './Forms/WalletIntro';
import {getKey} from '../../utils/keyGenerator/keyGenerator';
const CreateWalletStack = createStackNavigator();

export default function CreateWalletStackScreens({
  createProfile,
  initialFlow = 'choice',
  testProfile = false,
}) {
  const [newSeed, setNewSeed] = useState(null)
  const [importedSeed, setImportedSeed] = useState(null)

  const ensureNewSeed = async () => {
    if (newSeed) return newSeed;

    try {
      const seed = await getKey(256);

      setNewSeed(seed);
      return seed;
    } catch (e) {
      createAlert('Error', 'Error generating Secret Recovery Phrase.');
      console.warn(e);
      return null;
    }
  };

  const completeSeedSetup = (asNew, useSeedAsZ, seedOverride) => {
    return createProfile(
      asNew
        ? (seedOverride != null ? seedOverride : newSeed)
        : (seedOverride != null ? seedOverride : importedSeed),
      testProfile,
      useSeedAsZ,
    )
  }

  const initialRouteName = initialFlow === 'create' ? 'CreateSeed' : 'WalletIntro';

  return (
    <CreateWalletStack.Navigator initialRouteName={initialRouteName}>
      <CreateWalletStack.Screen
        name="WalletIntro"
        options={{
          headerShown: false,
        }}>
        {({navigation}) => (
          <WalletIntro
            navigation={navigation}
            ensureNewSeed={ensureNewSeed}
            testProfile={testProfile}
          />
        )}
      </CreateWalletStack.Screen>
      <CreateWalletStack.Screen
        name="CreateSeed"
        options={{
          headerShown: false,
        }}>
        {({navigation, route}) => (
          <CreateSeedStackScreens
            navigation={navigation}
            newSeed={route.params?.seed || newSeed}
            ensureNewSeed={ensureNewSeed}
            onComplete={(useSeedAsZ, seedOverride) =>
              completeSeedSetup(true, useSeedAsZ, seedOverride)
            }
          />
        )}
      </CreateWalletStack.Screen>
      <CreateWalletStack.Screen
        name="ImportWallet"
        options={{
          headerShown: false,
        }}>
        {({navigation}) => (
          <ImportWalletStackScreens
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={(seed, options = {}) =>
              completeSeedSetup(false, !!options.useSeedAsZ, seed)
            }
          />
        )}
      </CreateWalletStack.Screen>
    </CreateWalletStack.Navigator>
  );
}
