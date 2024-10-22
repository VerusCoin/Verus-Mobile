import React from 'react';
import { useEffect, useState } from "react"
import { Keyboard, ScrollView, TouchableWithoutFeedback, View } from "react-native";
import { Button, Checkbox, TextInput } from "react-native-paper";
import { useSelector } from 'react-redux';
import { initializeAccountData } from "../../../../actions/actionDispatchers";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import Colors from '../../../../globals/colors';
import styles from "../../../../styles";
import { SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_USER_TO_AUTHENTICATE } from "../../../../utils/constants/sendModal";
import { getBiometricPassword, getSupportedBiometryType } from '../../../../utils/keychain/keychain';

const AuthenticateUserPassword = props => {
  const [password, setPassword] = useState("")
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const accounts = useSelector(state => state.authentication.accounts)
  const activeAccount = useSelector(state => state.authentication.activeAccount)
  const data = useSelector(state => state.sendModal.data)
  const account =
    props.route.params == null || props.route.params.account == null
      ? accounts.find(
          x => x.accountHash === data[SEND_MODAL_USER_TO_AUTHENTICATE],
        )
      : props.route.params.account;
  const defaultAccountSelected = account != null && defaultAccount === account.accountHash
  const [makeDefaultAccount, setMakeDefaultAccount] = useState(defaultAccountSelected)

  const tryUnlockAccount = async key => {
    await props.setLoading(true);
    await props.setPreventExit(true)
    props.updateSendFormData(SEND_MODAL_USER_TO_AUTHENTICATE, account.accountHash)
    Keyboard.dismiss();

    try {
      await initializeAccountData(
        account,
        key,
        makeDefaultAccount
      );

      await props.setLoading(false);
      await props.setPreventExit(false);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT);
    } catch(e) {
      await props.setLoading(false);
      await props.setPreventExit(false);
      console.warn(e)
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
  }

  return (
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
      <View style={styles.wideBlock}>
        <Checkbox.Item
          color={Colors.primaryColor}
          label={'Make default'}
          status={makeDefaultAccount ? 'checked' : 'unchecked'}
          onPress={() => setMakeDefaultAccount(!makeDefaultAccount)}
          mode="android"
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
          textColor={Colors.warningButtonColor}
          style={{width: 148}}
          onPress={() => goBack()}>
          Back
        </Button>
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