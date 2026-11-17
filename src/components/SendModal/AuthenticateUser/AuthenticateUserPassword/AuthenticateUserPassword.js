import React from 'react';
import { useEffect, useState } from "react"
import { Keyboard, ScrollView, TouchableWithoutFeedback, View } from "react-native";
import Colors from '../../../../globals/colors';
import AppButton from '../../../AppButton';
import {Button,  TextInput } from "react-native-paper";
import { useDispatch } from 'react-redux';
import { initializeAccountData } from "../../../../actions/actionDispatchers";
import {setBiometry} from '../../../../actions/actionCreators';
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import styles from "../../../../styles";
import { SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_USER_TO_AUTHENTICATE } from "../../../../utils/constants/sendModal";
import { getSupportedBiometryType } from '../../../../utils/keychain/keychain';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import {
  getBiometricPassword,
  isBiometricPasswordUnavailableError,
} from '../../../../utils/keychain/biometrics';
import AnimatedActivityIndicatorBox from '../../../AnimatedActivityIndicatorBox';

export const disableBiometryForUnavailableLogin = async (
  error,
  accountHash,
  dispatch,
) => {
  if (!isBiometricPasswordUnavailableError(error)) return false;

  dispatch(await setBiometry(accountHash, false));
  return true;
};

export const resolveAuthenticationAccount = (
  accounts,
  routeAccount,
  requestedAccountHash,
) => {
  const accountHash = routeAccount?.accountHash || requestedAccountHash;
  return (
    accounts.find(account => account.accountHash === accountHash) || routeAccount
  );
};

const passwordValidationMessages = new Set([
  'Incorrect password',
  'Please select an existing user',
  'Please enter a password',
]);

const loginFailureMessage = error => {
  // Channel initialization wraps the underlying failure. Show its message,
  // without serializing error objects that may contain protected account data.
  const failures = Array.isArray(error?.failures) ? error.failures : [];
  const cause = failures.find(failure =>
    typeof failure?.message === 'string' && failure.message.trim(),
  ) || error?.cause || error;

  return typeof cause?.message === 'string' && cause.message.trim()
    ? cause.message
    : 'Unable to unlock this profile. Please try again.';
};

const AuthenticateUserPassword = props => {
  const dispatch = useDispatch();
  const [password, setPassword] = useState("")
  const accounts = useObjectSelector(state => state.authentication.accounts)
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount)
  const data = useObjectSelector(state => state.sendModal.data)
  
  const account = resolveAuthenticationAccount(
    accounts,
    props.route.params?.account,
    data[SEND_MODAL_USER_TO_AUTHENTICATE],
  );

  const [internalLoading, setInternalLoading] = useState(false)

  const tryUnlockAccount = async key => {
    setInternalLoading(true);
    await props.setPreventExit(true)
    props.updateSendFormData(SEND_MODAL_USER_TO_AUTHENTICATE, account.accountHash)
    Keyboard.dismiss();

    try {
      await initializeAccountData(account, key);

      setInternalLoading(false);
      await props.setPreventExit(false);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT);
    } catch(e) {
      setInternalLoading(false);
      await props.setPreventExit(false);

      // Password validation already displays its own alert. Initialization
      // failures can roll back the session and unmount this form, so use the
      // app-wide alert queue to keep their explanation visible after rollback.
      if (!passwordValidationMessages.has(e?.message)) {
        await createAlert('Unable to log in', loginFailureMessage(e));
      }
    }
  }

  async function onMount() {
    if (
      account != null &&
      account.biometry &&
      (await getSupportedBiometryType()).biometry &&
      (activeAccount == null ||
        activeAccount.accountHash !== account.accountHash)
    ) {
      try {
        const password = await getBiometricPassword(
          account.accountHash,
          'Authenticate to unlock wallet',
        );

        if (password != null) {
          setPassword(password);
          await tryUnlockAccount(password);
        }
      } catch (e) {
        let disabled = false;
        try {
          disabled = await disableBiometryForUnavailableLogin(
            e,
            account.accountHash,
            dispatch,
          );
        } catch (disableError) {
          console.error(disableError);
        }
        if (!disabled) console.error(e);
      }
    }
  }

  useEffect(() => {
    onMount();
  }, []);

  const goBack = () => {
    Keyboard.dismiss();
    
    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
    props.updateSendFormData(SEND_MODAL_USER_TO_AUTHENTICATE, null);
  }

  return internalLoading ? <AnimatedActivityIndicatorBox /> : (
    <View
      style={{
        ...styles.flexBackground,
        ...styles.fullWidth,
        ...styles.centerContainer,
        justifyContent: 'flex-start',
      }}
      contentContainerStyle={{
      }}>
      <View style={styles.wideBlock}>
        <TextInput
          returnKeyType="done"
          label={`Enter password for ${account != null ? account.id : ""}`}
          value={password}
          mode="outlined"
          onChangeText={text => setPassword(text)}
          autoCapitalize={'none'}
          autoCorrect={false}
          secureTextEntry={true}
        />
      </View>
      <View
        style={{
          ...styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          display: 'flex',
        }}>
        <AppButton
          variant="secondary"
          style={{width: 148}}
          onPress={() => goBack()}>
          Back
        </AppButton>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={password.length == 0 ? Colors.lightGrey : Colors.secondaryColor}
          style={{width: 148}}
          disabled={password.length == 0}
          onPress={() => tryUnlockAccount(password)}>
          Unlock
        </Button>
      </View>
    </View>
  );
};

export default AuthenticateUserPassword
