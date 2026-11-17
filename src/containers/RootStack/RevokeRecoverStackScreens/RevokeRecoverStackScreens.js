import React, {useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {defaultHeaderOptions} from '../../../utils/navigation/header';
import RevokeRecoverSlider from '../../RevokeRecover/RevokeRecoverSlider';
import ImportWalletStackScreens from '../../CreateWallet/Forms/ImportWallet/ImportWallet';
import RevokeRecoverIdentityForm from '../../RevokeRecover/RevokeRecoverIdentityForm';
import {NavigationActions} from '@react-navigation/compat';

const RevokeRecoverStack = createStackNavigator();

const RevokeRecoverStackScreens = props => {
  const [importedSeed, setImportedSeed] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [importSession, setImportSession] = useState({id: 0, method: null});
  const initialNetworkKey = props.route?.params?.networkKey;

  const exitRevokeRecover = () =>
    props.navigation.dispatch(NavigationActions.back());

  const completeImport = (seed, navigation) => {
    if (seed != null) setImportedSeed(seed);

    navigation.navigate('IdentityForm');
  };

  return (
    <RevokeRecoverStack.Navigator screenOptions={defaultHeaderOptions}>
      <RevokeRecoverStack.Screen
        name="Slider"
        options={{
          headerShown: false,
        }}>
        {screenProps => (
          <RevokeRecoverSlider
            navigation={screenProps.navigation}
            onSelectImportMethod={method => {
              setImportSession(current => ({
                id: current.id + 1,
                method,
              }));
              screenProps.navigation.navigate('ImportWallet');
            }}
            setImportedSeed={setImportedSeed}
            setIsRecovery={setIsRecovery}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="ImportWallet"
        listeners={{
          // Back from Choose blockchain must not restore the authority secret.
          focus: () => setImportedSeed(''),
          beforeRemove: () => setImportedSeed(null),
        }}
        options={{
          headerShown: false,
        }}>
        {screenProps => (
          <ImportWalletStackScreens
            key={`authority-import-${importSession.id}`}
            navigation={screenProps.navigation}
            initialMethod={importSession.method}
            offerShieldedRestore={false}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={seed => completeImport(seed, screenProps.navigation)}
            label={`Import ${isRecovery ? 'Recovery' : 'Revocation'} Authority`}
            progressStart={0.2}
            progressEnd={0.42}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="IdentityForm"
        options={{
          headerShown: false,
        }}>
        {screenProps => (
          <RevokeRecoverIdentityForm
            navigation={screenProps.navigation}
            isRecovery={isRecovery}
            importedSeed={importedSeed}
            initialNetworkKey={initialNetworkKey}
            exitRevokeRecover={exitRevokeRecover}
          />
        )}
      </RevokeRecoverStack.Screen>
    </RevokeRecoverStack.Navigator>
  );
};

export default RevokeRecoverStackScreens;
