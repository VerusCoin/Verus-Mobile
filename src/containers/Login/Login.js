/*
  This component's purpose is to present the user with the option
  to log into their accounts, and will only be shown if at least on account
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull
  login, creates a new update heartbeat interval.
*/

import React, {useEffect, useRef} from 'react';
import {View, Dimensions, SafeAreaView} from 'react-native';
import {Text} from 'react-native-paper';
import Styles from '../../styles/index';
import Colors from '../../globals/colors';
import {VerusLogo} from '../../images/customIcons';
import {openAuthenticateUserModal} from '../../actions/actions/sendModal/dispatchers/sendModal';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_USER_TO_AUTHENTICATE,
} from '../../utils/constants/sendModal';
import {useSelector} from 'react-redux';
import TallButton from '../../components/LargerButton';
import SignedOutDropdown from '../SignedOutDropdown/SignedOutDropdown';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { selectHasAuthenticatedSession } from '../../selectors/authentication';
import {readDeeplinkFromNfc} from '../../actions/actionDispatchers';

const {height} = Dimensions.get('window');

const Login = props => {
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const authModalUsed = useSelector(
    state => state.authentication.authModalUsed,
  );
  const modalVisible = useSelector(
    state => state.sendModal.visible,
  );
  
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const hasAuthenticatedSession = useSelector(selectHasAuthenticatedSession);
  const autoOpenTimeoutRef = useRef(null);

  const openAuthModal = ignoreDefault => {
    if (hasAuthenticatedSession) {
      return;
    }

    if (ignoreDefault) {
      openAuthenticateUserModal();
    } else {
      openAuthenticateUserModal(
        {
          [SEND_MODAL_USER_TO_AUTHENTICATE]: defaultAccount,
        },
        defaultAccount != null &&
          !authModalUsed &&
          accounts.find(x => x.accountHash === defaultAccount) != null
          ? SEND_MODAL_FORM_STEP_CONFIRM
          : SEND_MODAL_FORM_STEP_FORM,
      );
    }
  };

  useEffect(() => {
    if (autoOpenTimeoutRef.current != null) {
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    if (
      !hasAuthenticatedSession &&
      !authModalUsed &&
      defaultAccount != null &&
      accounts.find(x => x.accountHash === defaultAccount) != null
    ) {
      autoOpenTimeoutRef.current = setTimeout(() => {
        openAuthModal();
      }, 700);
    }

    return () => {
      if (autoOpenTimeoutRef.current != null) {
        clearTimeout(autoOpenTimeoutRef.current);
        autoOpenTimeoutRef.current = null;
      }
    };
  }, [accounts, authModalUsed, defaultAccount, hasAuthenticatedSession]);

  const handleAddUser = () => {
    props.navigation.navigate('CreateProfile');
  };

  const handleRevokeRecover = () => {
    props.navigation.navigate('RevokeRecover');
  };

  const handleRecoverSeed = () => {
    props.navigation.navigate('RecoverSeeds');
  };

  const handleProvisioningRequests = () => {
    props.navigation.navigate('ProvisioningDeeplinks');
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: Colors.secondaryColor,
        ...Styles.focalCenter,
      }}>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 20,
          elevation: 20,
        }}>
        {!modalVisible && <SignedOutDropdown
          handleRecoverSeed={() => handleRecoverSeed()}
          handleRevokeRecover={() => handleRevokeRecover()}
          handleProvisioningRequests={() => handleProvisioningRequests()}
          handleReadDeeplinkFromNfc={readDeeplinkFromNfc}
          hasAccount={true}
        />}
      </View>
      <VerusLogo
        width={180}
        height={'15%'}
        style={{top: 100, position: 'absolute'}}
      />
      <View
        style={{
          alignItems: 'center',
          position: 'absolute',
          top: height / 2 - 40,
        }}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
          }}>
          {'Welcome to Verus'}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 20,
          }}>
          {'Truth and Privacy for All'}
        </Text>
      </View>
      <TallButton
        onPress={() => openAuthModal()}
        mode="contained"
        labelStyle={{fontWeight: 'bold'}}
        style={{
          position: 'absolute',
          bottom: 86, // Adjusted position
          width: 280,
        }}>
        {'Login'}
      </TallButton>
      <TallButton
        onPress={() => handleAddUser()}
        mode="text"
        labelStyle={{fontWeight: 'bold'}}
        style={{
          position: 'absolute',
          bottom: 30, // Adjusted position
          width: 280,
        }}>
        {'Add a profile'}
      </TallButton>
    </SafeAreaView>
  );
};

export default Login;
