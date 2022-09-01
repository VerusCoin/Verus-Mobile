import React, { Component } from "react";
import { Platform, SafeAreaView } from "react-native";
import { Text, Portal, Button } from "react-native-paper";
import { Colors } from "react-native/Libraries/NewAppScreen";
import {
  CONVERSION_SEND_MODAL,
  DEPOSIT_SEND_MODAL,
  LINK_IDENTITY_SEND_MODAL,
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

const TopTabs = createMaterialTopTabNavigator();
const Root = createStackNavigator();

const SEND_FORMS = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendForm,
  [CONVERSION_SEND_MODAL]: ConversionSendForm,
  [WITHDRAW_SEND_MODAL]: WithdrawSendForm,
  [DEPOSIT_SEND_MODAL]: DepositSendForm,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityForm
};

const SEND_CONFIRMATION = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendConfirm,
  [CONVERSION_SEND_MODAL]: ConversionSendConfirm,
  [WITHDRAW_SEND_MODAL]: WithdrawSendConfirm,
  [DEPOSIT_SEND_MODAL]: DepositSendConfirm,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityConfirm
};

const SEND_RESULTS = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendResult,
  [CONVERSION_SEND_MODAL]: ConversionSendResult,
  [WITHDRAW_SEND_MODAL]: WithdrawSendResult,
  [DEPOSIT_SEND_MODAL]: DepositSendResult,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityResult
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
                headerTitle: () => <Text style={{ marginBottom: 10, fontSize: 16 }}>{title}</Text>,
                headerRight: (props) => (
                  <Button
                    {...props}
                    style={{ marginBottom: 10 }}
                    onPress={() => this.showHelpModal()}
                    color={Colors.primaryColor}
                    disabled={this.state.preventExit}
                  >
                    {"Help"}
                  </Button>
                ),
                headerLeft: (props) => (
                  <Button
                    {...props}
                    style={{ marginBottom: 10 }}
                    onPress={() => this.cancel()}
                    color={Colors.primaryColor}
                    disabled={this.state.preventExit}
                  >
                    {"Close"}
                  </Button>
                ),
                headerStyle: {
                  height: 42,
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
      initialRouteName={SEND_MODAL_FORM_STEP_FORM}
      swipeEnabled={false}
      backBehavior={"none"}
      tabBarPosition="bottom"
      tabBarOptions={{
        pressColor: "transparent",
        pressOpacity: 1,
      }}
      lazy={true}
      lazyPlaceholder={() => <AnimatedActivityIndicatorBox />}
    >
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_FORM}
        options={{
          tabBarLabel: "Enter",
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      >
        {(props) => <Form {...props} {...starterProps} />}
      </TopTabs.Screen>
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_CONFIRM}
        options={{
          tabBarLabel: "Confirm",
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      >
        {(props) => <Confirmation {...props} {...starterProps} />}
      </TopTabs.Screen>
      <TopTabs.Screen
        name={SEND_MODAL_FORM_STEP_RESULT}
        options={{
          tabBarLabel: "Result",
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      >
        {(props) => <Result {...props} {...starterProps} />}
      </TopTabs.Screen>
    </TopTabs.Navigator>
  );
};