/*
  This component's purpose is to present the user with the option 
  to log into their accounts, and will only be shown if at least on account 
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull 
  login, creates a new update heartbeat interval.
*/

import React, { useEffect } from "react";
import { 
  View,
  ScrollView,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { VerusLogo } from "../../images/customIcons";
import { TouchableOpacity } from "react-native";
import { openAuthenticateUserModal } from "../../actions/actions/sendModal/dispatchers/sendModal";
import { SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_USER_TO_AUTHENTICATE } from "../../utils/constants/sendModal";
import { useSelector } from "react-redux";

const Login = props => {
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const authModalUsed = useSelector(
    state => state.authentication.authModalUsed,
  );
  const accounts = useSelector(state => state.authentication.accounts)

  openAuthModal = ignoreDefault => {
    if (ignoreDefault) openAuthenticateUserModal();
    else {
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
    if (
      !authModalUsed &&
      defaultAccount != null &&
      accounts.find(x => x.accountHash === defaultAccount) != null
    ) {
      setTimeout(() => {
        openAuthModal();
      }, 700);
    }   
  }, []);

  handleAddUser = () => {
    props.navigation.navigate("SignIn")
  }

  return (
    <ScrollView
      contentContainerStyle={Styles.focalCenter}
      style={Styles.backgroundColorWhite}>
      <VerusLogo width={'60%'} height={'15%'} />
      <View style={Styles.fullWidthFlexCenterBlock}>
        <View style={Styles.flexCenterRowBlock}>
          <Button onPress={() => openAuthModal()} color={Colors.primaryColor}>
            {'Login'}
          </Button>
        </View>
      </View>
      <View style={Styles.fullWidthFlexCenterBlock}>
        <View style={Styles.flexCenterRowBlock}>
          <Button onPress={() => handleAddUser()} color={Colors.primaryColor}>
            {'Add a profile'}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default Login;