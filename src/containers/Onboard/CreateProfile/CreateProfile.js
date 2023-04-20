import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {addCoin, addUser} from '../../../actions/actionCreators';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {CHANNELS, ELECTRUM} from '../../../utils/constants/intervalConstants';
import {hashAccountId} from '../../../utils/crypto/hash';
import {storeBiometricPassword} from '../../../utils/keychain/keychain';
import {arrayToObject} from '../../../utils/objectManip';
import CreateWalletStackScreens from '../../CreateWallet/CreateWallet';
import ChooseName from './Forms/ChooseName';
import CreatePassword from './Forms/CreatePassword';
import UseBiometrics from './Forms/UseBiometrics';
import {KEY_DERIVATION_VERSION} from '../../../../env/index';
import {findCoinObj} from '../../../utils/CoinData/CoinData';
import {START_COINS} from '../../../utils/constants/constants';
import {useDispatch, useSelector} from 'react-redux';
import {
  closeLoadingModal,
  initializeAccountData,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import { deriveKeyPair } from '../../../utils/keys';

const CreateProfileStack = createStackNavigator();

export default function CreateProfileStackScreens(props) {
  const [profileName, setProfileName] = useState('');
  const [password, setPassword] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const dispatch = useDispatch();
  const accounts = useSelector(state => state.authentication.accounts);
  const activeCoinList = useSelector(state => state.coins.activeCoinList);

  const addStartingCoins = async accountId => {
    for (const coinId of START_COINS) {
      const fullCoinData = findCoinObj(coinId, accountId);

      dispatch(await addCoin(fullCoinData, activeCoinList, accountId, []));
    }
  };

  const createProfile = async (seed) => {
    openLoadingModal('Setting up your new profile...');

    try {
      const _userName = profileName;
      const _pin = password;
      const _seeds = {[ELECTRUM]: seed};

      try {
        for (const startCoin of START_COINS) {
          await deriveKeyPair(
            seed,
            findCoinObj(startCoin),
            ELECTRUM,
            KEY_DERIVATION_VERSION,
          );
        }
      } catch(e) {
        throw new Error(`Could not create keypair from seed: ${e.message}`);
      }

      if (_seeds[ELECTRUM] == null) {
        throw new Error('Please configure at least a primary seed.');
      }

      let biometry = false;
      const accountHash = hashAccountId(_userName);

      if (accounts.find(x => x.accountHash === accountHash) != null) {
        throw new Error('Cannot create duplicate account.');
      }

      if (useBiometrics) {
        try {
          await storeBiometricPassword(accountHash, _pin);
          biometry = true;
        } catch (e) {
          console.warn(e);
        }
      }

      const action = await addUser(
        _userName,
        arrayToObject(CHANNELS, (acc, channel) => _seeds[channel], true),
        _pin,
        accounts,
        biometry,
        KEY_DERIVATION_VERSION,
      );

      dispatch(action);
      await addStartingCoins(_userName);

      const newAccount = action.payload.accounts.find(
        x => x.accountHash === accountHash,
      );

      if (!newAccount) {
        throw new Error('Failed to create new account');
      }

      //Log in new user
      await initializeAccountData(newAccount, _pin);
      createAlert('Profile created!', `Your '${_userName}' profile has been created and is ready to use.`);
    } catch (e) {
      console.error(e)
      createAlert('Error', e.message);
    }

    closeLoadingModal();
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
