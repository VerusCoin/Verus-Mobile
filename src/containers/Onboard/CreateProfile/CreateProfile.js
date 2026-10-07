import {createStackNavigator} from '@react-navigation/stack';
import React, {useRef, useState} from 'react';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import CreateWalletStackScreens from '../../CreateWallet/CreateWallet';
import ChooseName from './Forms/ChooseName';
import CreatePassword from './Forms/CreatePassword';
import UseBiometrics from './Forms/UseBiometrics';
import {useDispatch} from 'react-redux';
import {
  closeLoadingModal,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { createProfileFromSeed } from '../../../utils/profile/createProfileFromSeed';

const CreateProfileStack = createStackNavigator();

export default function CreateProfileStackScreens(props) {
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const creationStarted = useRef(false);
  const dispatch = useDispatch();

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const createProfile = async (seed, testProfile, useSeedAsZ) => {
    // Block queued taps immediately, before the loading modal can render.
    if (creationStarted.current) return;
    creationStarted.current = true;
    let created = false;

    try {
      openLoadingModal('Setting up your new profile...');
      await createProfileFromSeed({
        profileName,
        password,
        seed,
        accounts,
        activeCoinList,
        dispatch,
        testProfile,
        includeDlightSeed: useSeedAsZ,
        useBiometrics,
      });
      created = true;

      createAlert('Profile created!', `Your '${profileName}' profile has been created and is ready to use.`);
    } catch (e) {
      console.error(e)
      createAlert('Error', e.message);
    } finally {
      // Allow a failed attempt to be corrected, but ignore late success taps
      // while navigation is switching away from onboarding.
      if (!created) creationStarted.current = false;
      closeLoadingModal();
    }
  };

  return (
    <CreateProfileStack.Navigator>
      <CreateProfileStack.Screen
        name="ChooseName"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ChooseName
            profileName={profileName}
            setProfileName={setProfileName}
            navigation={props.navigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="CreatePassword"
        options={{
          headerShown: false,
        }}>
        {() => (
          <CreatePassword
            password={password}
            setPassword={setPassword}
            navigation={props.navigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="UseBiometrics"
        options={{
          headerShown: false,
        }}>
        {() => (
          <UseBiometrics
            useBiometrics={useBiometrics}
            setUseBiometrics={setUseBiometrics}
            navigation={props.navigation}
          />
        )}
      </CreateProfileStack.Screen>
      <CreateProfileStack.Screen
        name="CreateWallet"
        options={{
          headerShown: false,
        }}>
        {() => (
          <CreateWalletStackScreens
            navigation={props.navigation}
            createProfile={createProfile}
          />
        )}
      </CreateProfileStack.Screen>
    </CreateProfileStack.Navigator>
  );
}
