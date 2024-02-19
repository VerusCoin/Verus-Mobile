import React from 'react';
import { useEffect, useState } from "react"
import { Keyboard, ScrollView, TouchableWithoutFeedback, View } from "react-native";
import { Button, Checkbox, TextInput } from "react-native-paper";
import { useDispatch, useSelector } from 'react-redux';
import { initializeAccountData } from "../../../../actions/actionDispatchers";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import Colors from '../../../../globals/colors';
import styles from "../../../../styles";
import { SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_USER_TO_AUTHENTICATE } from "../../../../utils/constants/sendModal";
import { getBiometricPassword, getSupportedBiometryType } from '../../../../utils/keychain/keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDarkModeState } from '../../../../actions/actionCreators';

const AuthenticateUserPassword = props => {
  const [password, setPassword] = useState('');
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const accounts = useSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const data = useSelector(state => state.sendModal.data);
  const darkMode = useSelector(state => state.settings.darkModeState);
  const account =
    props.route.params == null || props.route.params.account == null
      ? accounts.find(
          x => x.accountHash === data[SEND_MODAL_USER_TO_AUTHENTICATE],
        )
      : props.route.params.account;
  const defaultAccountSelected =
    account != null && defaultAccount === account.accountHash;
  const [makeDefaultAccount, setMakeDefaultAccount] = useState(
    defaultAccountSelected,
  );
  const dispatch = useDispatch()

  const tryUnlockAccount = async key => {
    const value = await AsyncStorage.getItem('darkModeKey');
    dispatch(setDarkModeState(JSON.parse(value)));
    await props.setLoading(true);
    await props.setPreventExit(true);
    props.updateSendFormData(
      SEND_MODAL_USER_TO_AUTHENTICATE,
      account.accountHash,
    );
    Keyboard.dismiss();
    try {
      await initializeAccountData(account, key, makeDefaultAccount);
      await props.setLoading(false);
      await props.setPreventExit(false);
    const value = await AsyncStorage.getItem('darkModeKey');
    dispatch(setDarkModeState(JSON.parse(value)));
      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT);
      dispatch(setDarkModeState(JSON.parse(value)));
    } catch (e) {
      await props.setLoading(false);
      await props.setPreventExit(false);
      console.warn(e);
    }
  };

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
          'Authenticate to unlock profile',
        );

        setPassword(password);
        await tryUnlockAccount(password);
      } catch (e) {
        console.error(e);
      }
    }
  }

  useEffect(() => {
    onMount();
  }, []);

  goBack = () => {
    Keyboard.dismiss();

    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
    props.updateSendFormData(SEND_MODAL_USER_TO_AUTHENTICATE, null);
  };

  return (
    <View
      style={{
        ...styles.flexBackground,
        ...styles.fullWidth,
        ...styles.centerContainer,
        justifyContent: 'flex-start',
        backgroundColor: darkMode
          ? Colors.darkModeColor
          : Colors.secondaryColor,
      }}
      contentContainerStyle={{}}>
      <View style={styles.wideBlock}>
        <TextInput
          style={{
            backgroundColor: darkMode
              ? Colors.verusDarkModeForm
              : Colors.ultraUltraLightGrey,
          }}
          theme={{
            colors: {
              text: darkMode ? Colors.secondaryColor : Colors.quaternaryColor,
              placeholder: darkMode
                ? Colors.verusDarkGray
                : Colors.verusDarkGray,
            },
          }}
          returnKeyType="done"
          label={`Enter password for ${account != null ? account.id : ''}`}
          value={password}
          mode="outlined"
          onChangeText={text => setPassword(text)}
          autoCapitalize={'none'}
          autoCorrect={false}
          secureTextEntry={true}
        />
      </View>
      <View style={styles.wideBlock}>
        <Checkbox.Item
          color={Colors.primaryColor}
          labelStyle={{
            color: darkMode ? Colors.secondaryColor : Colors.quinaryColor,
          }}
          label={'Make default'}
          status={makeDefaultAccount ? 'checked' : 'unchecked'}
          onPress={() => setMakeDefaultAccount(!makeDefaultAccount)}
          mode="android"
          uncheckedColor={
            darkMode ? Colors.secondaryColor : Colors.quinaryColor
          }
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
        <Button
          color={Colors.warningButtonColor}
          style={{width: 148}}
          onPress={() => goBack()}>
          Back
        </Button>
        <Button
          color={darkMode ? Colors.secondaryColor : Colors.verusGreenColor}
          style={{width: 148}}
          disabled={password.length == 0}
          onPress={() => tryUnlockAccount(password)}>
          Unlock
        </Button>
      </View>
    </View>
  );
};

export default AuthenticateUserPassword;