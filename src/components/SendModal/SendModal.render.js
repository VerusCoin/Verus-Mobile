import React, { Component } from "react";
import { Platform, SafeAreaView, View } from "react-native";
import { Text, Portal, Button } from "react-native-paper";
import Colors from "../../globals/colors";
import {
  ADD_ERC20_TOKEN_MODAL,
  ADD_PBAAS_CURRENCY_MODAL,
  AUTHENTICATE_USER_SEND_MODAL,
  CONVERSION_SEND_MODAL,
  CONVERT_OR_CROSS_CHAIN_SEND_MODAL,
  DEPOSIT_SEND_MODAL,
  LINK_IDENTITY_SEND_MODAL,
  PROVISION_IDENTITY_SEND_MODAL,
  RECOVER_IDENTITY_SEND_MODAL,
  REVOKE_IDENTITY_SEND_MODAL,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  TRADITIONAL_CRYPTO_SEND_MODAL,
  WITHDRAW_SEND_MODAL,
} from "../../utils/constants/sendModal";
import SemiModal from "../SemiModal";
import TraditionalCryptoSendForm from "./TraditionalCryptoSend/TraditionalCryptoSendForm/TraditionalCryptoSendForm";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AnimatedActivityIndicatorBox from "../AnimatedActivityIndicatorBox";
import TraditionalCryptoSendConfirm from "./TraditionalCryptoSend/TraditionalCryptoSendConfirm/TraditionalCryptoSendConfirm";
import TraditionalCryptoSendResult from "./TraditionalCryptoSend/TraditionalCryptoSendResult/TraditionalCryptoSendResult";
import ConversionSendForm from "./ConversionSend/ConversionSendForm/ConversionSendForm";
import ConversionSendConfirm from "./ConversionSend/ConversionSendConfirm/ConversionSendConfirm";
import ConversionSendResult from "./ConversionSend/ConversionSendResult/ConversionSendResult";
import WithdrawSendForm from "./WithdrawSend/WithdrawSendForm/WithdrawSendForm";
import WithdrawSendConfirm from "./WithdrawSend/WithdrawSendConfirm/WithdrawSendConfirm";
import WithdrawSendResult from "./WithdrawSend/WithdrawSendResult/WithdrawSendResult";
import DepositSendForm from "./DepositSend/DepositSendForm/DepositSendForm";
import DepositSendConfirm from "./DepositSend/DepositSendConfirm/DepositSendConfirm";
import DepositSendResult from "./DepositSend/DepositSendResult/DepositSendResult";
import LinkIdentityForm from "./LinkIdentity/LinkIdentityForm/LinkIdentityForm";
import LinkIdentityConfirm from "./LinkIdentity/LinkIdentityConfirm/LinkIdentityConfirm";
import LinkIdentityResult from "./LinkIdentity/LinkIdentityResult/LinkIdentityResult";
import AuthenticateUserForm from "./AuthenticateUser/AuthenticateUserForm/AuthenticateUserForm";
import AuthenticateUserPassword from "./AuthenticateUser/AuthenticateUserPassword/AuthenticateUserPassword";
import AuthenticateUserResult from "./AuthenticateUser/AuthenticateUserResult/AuthenticateUserResult";
import ProvisionIdentityForm from "./ProvisionIdentity/ProvisionIdentityForm/ProvisionIdentityForm";
import ProvisionIdentityConfirm from "./ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm";
import ProvisionIdentityResult from "./ProvisionIdentity/ProvisionIdentityResult/ProvisionIdentityResult";
import AddPbaasCurrencyForm from "./AddPbaasCurrency/AddPbaasCurrencyForm/AddPbaasCurrencyForm";
import AddPbaasCurrencyConfirm from "./AddPbaasCurrency/AddPbaasCurrencyConfirm/AddPbaasCurrencyConfirm";
import AddPbaasCurrencyResult from "./AddPbaasCurrency/AddPbaasCurrencyResult/AddPbaasCurrencyResult";
import ConvertOrCrossChainSendForm from "./ConvertOrCrossChainSend/ConvertOrCrossChainSendForm/ConvertOrCrossChainSendForm";
import ConvertOrCrossChainSendConfirm from "./ConvertOrCrossChainSend/ConvertOrCrossChainSendConfirm/ConvertOrCrossChainSendConfirm";
import ConvertOrCrossChainSendResult from "./ConvertOrCrossChainSend/ConvertOrCrossChainSendResult/ConvertOrCrossChainSendResult";
import AddErc20TokenForm from "./AddErc20Token/AddErc20TokenForm/AddErc20TokenForm";
import AddErc20TokenConfirm from "./AddErc20Token/AddErc20TokenConfirm/AddErc20TokenConfirm";
import AddErc20TokenResult from "./AddErc20Token/AddErc20TokenResult/AddErc20TokenResult";
import RevokeIdentityForm from "./RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm";
import RevokeIdentityConfirm from "./RevokeIdentity/RevokeIdentityConfirm/RevokeIdentityConfirm";
import RevokeIdentityResult from "./RevokeIdentity/RevokeIdentityResult/RevokeIdentityResult";
import RecoverIdentityForm from "./RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm";
import RecoverIdentityConfirm from "./RecoverIdentity/RecoverIdentityConfirm/RecoverIdentityConfirm";
import RecoverIdentityResult from "./RecoverIdentity/RecoverIdentityResult/RecoverIdentityResult";

const TopTabs = createMaterialTopTabNavigator();
const Root = createStackNavigator();

const SEND_FORMS = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendForm,
  [CONVERSION_SEND_MODAL]: ConversionSendForm,
  [WITHDRAW_SEND_MODAL]: WithdrawSendForm,
  [DEPOSIT_SEND_MODAL]: DepositSendForm,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityForm,
  [PROVISION_IDENTITY_SEND_MODAL]: ProvisionIdentityForm,
  [AUTHENTICATE_USER_SEND_MODAL]: AuthenticateUserForm,
  [ADD_PBAAS_CURRENCY_MODAL]: AddPbaasCurrencyForm,
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendForm,
  [ADD_ERC20_TOKEN_MODAL]: AddErc20TokenForm,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityForm,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityForm
};

const SEND_CONFIRMATION = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendConfirm,
  [CONVERSION_SEND_MODAL]: ConversionSendConfirm,
  [WITHDRAW_SEND_MODAL]: WithdrawSendConfirm,
  [DEPOSIT_SEND_MODAL]: DepositSendConfirm,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityConfirm,
  [PROVISION_IDENTITY_SEND_MODAL]: ProvisionIdentityConfirm,
  [AUTHENTICATE_USER_SEND_MODAL]: AuthenticateUserPassword,
  [ADD_PBAAS_CURRENCY_MODAL]: AddPbaasCurrencyConfirm,
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendConfirm,
  [ADD_ERC20_TOKEN_MODAL]: AddErc20TokenConfirm,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityConfirm,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityConfirm
};

const SEND_RESULTS = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendResult,
  [CONVERSION_SEND_MODAL]: ConversionSendResult,
  [WITHDRAW_SEND_MODAL]: WithdrawSendResult,
  [DEPOSIT_SEND_MODAL]: DepositSendResult,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityResult,
  [PROVISION_IDENTITY_SEND_MODAL]: ProvisionIdentityResult,
  [AUTHENTICATE_USER_SEND_MODAL]: AuthenticateUserResult,
  [ADD_PBAAS_CURRENCY_MODAL]: AddPbaasCurrencyResult,
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendResult,
  [ADD_ERC20_TOKEN_MODAL]: AddErc20TokenResult,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityResult,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityResult
};

export const SendModalRender = function () {
  const { visible, title } = this.props.sendModal;
  const modalStarterHeight = this.state.modalHeight;
  const modalHeight = this.props.keyboard.active
    ? this.props.keyboard.height + modalStarterHeight
    : modalStarterHeight;


  return (
    <Portal>
      <NavigationContainer>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={() => this.cancel()}
          contentContainerStyle={{
            height: Platform.OS === "android" ? modalStarterHeight : modalHeight,
            flex: 0,
            backgroundColor: "white",
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <Root.Navigator
              screenOptions={{
                header: () => (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    backgroundColor: Colors.secondaryColor 
                  }}>
                    <Button
                      style={{ marginBottom: 16 }}
                      onPress={() => this.cancel()}
                      textColor={Colors.primaryColor}
                      disabled={this.state.preventExit}
                    >
                      {"Close"}
                    </Button>
                    <Text style={{ marginBottom: 16, fontSize: 16, textAlign: "center" }}>{title}</Text>
                    <Button
                      style={{ marginBottom: 16 }}
                      onPress={() => this.showHelpModal()}
                      textColor={Colors.primaryColor}
                      disabled={this.state.preventExit}
                    >
                      {"Help"}
                    </Button>   
                  </View>
                ),
                headerStyle: {
                  height: 52,
                },
              }}
            >
              <Root.Screen name="SendModalInner">{SendModalInnerAreaRender.call(this)}</Root.Screen>
            </Root.Navigator>
          </SafeAreaView>
        </SemiModal>
      </NavigationContainer>
    </Portal>
  );
};

export const SendModalInnerAreaRender = function () {
  const starterProps = {
    updateSendFormData: (key, value) => this.updateSendFormData(key, value),
    setLoading: (loading) => this.setLoading(loading),
    setModalHeight: (height) => this.setModalHeight(height),
    setPreventExit: (preventExit) => this.setPreventExit(preventExit),
    setVisible: (visible) => this.setVisible(visible)
  };

  const Form =
    this.state.loading || SEND_FORMS[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_FORMS[this.props.sendModal.type];

  const Confirmation =
    this.state.loading || SEND_CONFIRMATION[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_CONFIRMATION[this.props.sendModal.type];
  
  const Result =
    this.state.loading || SEND_RESULTS[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_RESULTS[this.props.sendModal.type];

  return () => (
    <TopTabs.Navigator
      initialRouteName={
        this.props.sendModal.initialRouteName
          ? this.props.sendModal.initialRouteName
          : SEND_MODAL_FORM_STEP_FORM
      }
      backBehavior={'none'}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: false,
        tabBarPressColor: "transparent",
        tabBarPressOpacity: 1,
        tabBarLabelStyle: {
          fontSize: 12
        },
        lazy: true,
        lazyPlaceholder: () => <AnimatedActivityIndicatorBox />
      }}>
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_FORM}
        options={{
          tabBarLabel:
            this.props.sendModal.type == AUTHENTICATE_USER_SEND_MODAL
              ? 'Select'
              : 'Enter',
        }}
        listeners={{
          tabPress: e => {
            e.preventDefault();
          },
        }}>
        {props => <Form {...props} {...starterProps} />}
      </TopTabs.Screen>
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_CONFIRM}
        options={{
          tabBarLabel:
            this.props.sendModal.type == AUTHENTICATE_USER_SEND_MODAL
              ? 'Login'
              : 'Confirm',
        }}
        listeners={{
          tabPress: e => {
            e.preventDefault();
          },
        }}>
        {props => <Confirmation {...props} {...starterProps} />}
      </TopTabs.Screen>
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_RESULT}
        options={{
          tabBarLabel: 'Result',
        }}
        listeners={{
          tabPress: e => {
            e.preventDefault();
          },
        }}>
        {props => <Result {...props} {...starterProps} />}
      </TopTabs.Screen>
    </TopTabs.Navigator>
  );
};