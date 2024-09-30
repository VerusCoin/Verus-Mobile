import React, { useState } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import RevokeRecoverSlider from '../../RevokeRecover/RevokeRecoverSlider';
import ImportWalletStackScreens from '../../CreateWallet/Forms/ImportWallet/ImportWallet';
import RevokeRecoverIdentityForm from '../../RevokeRecover/RevokeRecoverIdentityForm';
import { NavigationActions } from '@react-navigation/compat';

const RevokeRecoverStack = createStackNavigator();

const RevokeRecoverStackScreens = props => {
  const [importedSeed, setImportedSeed] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);

  const exitRevokeRecover = () => props.navigation.dispatch(NavigationActions.back())

  return (
    <RevokeRecoverStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <RevokeRecoverStack.Screen
        name="Slider"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          <RevokeRecoverSlider
            navigation={props.navigation}
            setIsRecovery={setIsRecovery}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="ImportWallet"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportWalletStackScreens
            navigation={props.navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={() => props.navigation.navigate("IdentityForm")}
            label={`Import ${isRecovery ? "Recovery" : "Revocation"} Seed or Key`}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="IdentityForm"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          <RevokeRecoverIdentityForm
            navigation={props.navigation}
            isRecovery={isRecovery}
            importedSeed={importedSeed}
            exitRevokeRecover={exitRevokeRecover}
          />
        )}
      </RevokeRecoverStack.Screen>
    </RevokeRecoverStack.Navigator>
  );
};

export default RevokeRecoverStackScreens