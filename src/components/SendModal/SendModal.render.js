import TextAction from '../TextAction';
import React, {Component} from 'react';
import {Modal, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Text, Portal} from 'react-native-paper';
import Colors from '../../globals/colors';
import {
  AUTHENTICATE_USER_SEND_MODAL,
  CONVERSION_SEND_MODAL,
  CONVERT_OR_CROSS_CHAIN_SEND_MODAL,
  SEND_MODAL_INVOICE_CONTEXT,
  DEPOSIT_SEND_MODAL,
  LINK_IDENTITY_SEND_MODAL,
  PROVISION_IDENTITY_SEND_MODAL,
  RECOVER_IDENTITY_SEND_MODAL,
  REVOKE_IDENTITY_SEND_MODAL,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET,
  SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET_AUTH_PICKER,
  TRADITIONAL_CRYPTO_SEND_MODAL,
  WITHDRAW_SEND_MODAL,
} from '../../utils/constants/sendModal';
import SemiModal from '../SemiModal';
import {OnboardingThemeProvider} from '../../theme/onboarding';
import TraditionalCryptoSendForm from './TraditionalCryptoSend/TraditionalCryptoSendForm/TraditionalCryptoSendForm';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AnimatedActivityIndicatorBox from '../AnimatedActivityIndicatorBox';
import TraditionalCryptoSendConfirm from './TraditionalCryptoSend/TraditionalCryptoSendConfirm/TraditionalCryptoSendConfirm';
import TraditionalCryptoSendResult from './TraditionalCryptoSend/TraditionalCryptoSendResult/TraditionalCryptoSendResult';
import ConversionSendForm from './ConversionSend/ConversionSendForm/ConversionSendForm';
import ConversionSendConfirm from './ConversionSend/ConversionSendConfirm/ConversionSendConfirm';
import ConversionSendResult from './ConversionSend/ConversionSendResult/ConversionSendResult';
import WithdrawSendForm from './WithdrawSend/WithdrawSendForm/WithdrawSendForm';
import WithdrawSendConfirm from './WithdrawSend/WithdrawSendConfirm/WithdrawSendConfirm';
import WithdrawSendResult from './WithdrawSend/WithdrawSendResult/WithdrawSendResult';
import DepositSendForm from './DepositSend/DepositSendForm/DepositSendForm';
import DepositSendConfirm from './DepositSend/DepositSendConfirm/DepositSendConfirm';
import DepositSendResult from './DepositSend/DepositSendResult/DepositSendResult';
import LinkIdentityForm from './LinkIdentity/LinkIdentityForm/LinkIdentityForm';
import LinkIdentityConfirm from './LinkIdentity/LinkIdentityConfirm/LinkIdentityConfirm';
import LinkIdentityResult from './LinkIdentity/LinkIdentityResult/LinkIdentityResult';
import AuthenticateUserForm from './AuthenticateUser/AuthenticateUserForm/AuthenticateUserForm';
import AuthenticateUserPassword from './AuthenticateUser/AuthenticateUserPassword/AuthenticateUserPassword';
import AuthenticateUserResult from './AuthenticateUser/AuthenticateUserResult/AuthenticateUserResult';
import ProvisionIdentityForm from './ProvisionIdentity/ProvisionIdentityForm/ProvisionIdentityForm';
import ProvisionIdentityConfirm from './ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm';
import ProvisionIdentityResult from './ProvisionIdentity/ProvisionIdentityResult/ProvisionIdentityResult';
import ProvisionIdentityBottomSheet from './ProvisionIdentity/ProvisionIdentityBottomSheet';
import ConvertOrCrossChainSendForm from './ConvertOrCrossChainSend/ConvertOrCrossChainSendForm/ConvertOrCrossChainSendForm';
import ConvertOrCrossChainSendConfirm from './ConvertOrCrossChainSend/ConvertOrCrossChainSendConfirm/ConvertOrCrossChainSendConfirm';
import ConvertOrCrossChainSendResult from './ConvertOrCrossChainSend/ConvertOrCrossChainSendResult/ConvertOrCrossChainSendResult';
import RevokeIdentityForm from './RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm';
import RevokeIdentityConfirm from './RevokeIdentity/RevokeIdentityConfirm/RevokeIdentityConfirm';
import RevokeIdentityResult from './RevokeIdentity/RevokeIdentityResult/RevokeIdentityResult';
import RecoverIdentityForm from './RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm';
import RecoverIdentityConfirm from './RecoverIdentity/RecoverIdentityConfirm/RecoverIdentityConfirm';
import RecoverIdentityResult from './RecoverIdentity/RecoverIdentityResult/RecoverIdentityResult';

import {InvoicePaymentLoading} from '../../containers/DeepLink/InvoiceInfo/InvoicePaymentParts';

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
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendForm,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityForm,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityForm,
};

const SEND_CONFIRMATION = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendConfirm,
  [CONVERSION_SEND_MODAL]: ConversionSendConfirm,
  [WITHDRAW_SEND_MODAL]: WithdrawSendConfirm,
  [DEPOSIT_SEND_MODAL]: DepositSendConfirm,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityConfirm,
  [PROVISION_IDENTITY_SEND_MODAL]: ProvisionIdentityConfirm,
  [AUTHENTICATE_USER_SEND_MODAL]: AuthenticateUserPassword,
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendConfirm,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityConfirm,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityConfirm,
};

const SEND_RESULTS = {
  [TRADITIONAL_CRYPTO_SEND_MODAL]: TraditionalCryptoSendResult,
  [CONVERSION_SEND_MODAL]: ConversionSendResult,
  [WITHDRAW_SEND_MODAL]: WithdrawSendResult,
  [DEPOSIT_SEND_MODAL]: DepositSendResult,
  [LINK_IDENTITY_SEND_MODAL]: LinkIdentityResult,
  [PROVISION_IDENTITY_SEND_MODAL]: ProvisionIdentityResult,
  [AUTHENTICATE_USER_SEND_MODAL]: AuthenticateUserResult,
  [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: ConvertOrCrossChainSendResult,
  [REVOKE_IDENTITY_SEND_MODAL]: RevokeIdentityResult,
  [RECOVER_IDENTITY_SEND_MODAL]: RecoverIdentityResult,
};

export const SendModalRender = function () {
  const {visible, title} = this.props.sendModal;
  const modalStarterHeight = this.state.modalHeight;
  const modalHeight = this.props.keyboard.active
    ? this.props.keyboard.height + modalStarterHeight
    : modalStarterHeight;

  if (this.props.sendModal.type === PROVISION_IDENTITY_SEND_MODAL) {
    const shouldReturnToIdentityPicker =
      this.props.sendModal.data?.[SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET] ===
      SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET_AUTH_PICKER;

    return (
      <OnboardingThemeProvider>
        <ProvisionIdentityBottomSheet
          visible={visible}
          onClose={() => this.cancel()}
          onClosed={() => this.handleProvisionIdentitySheetClosed()}
          onBack={
            shouldReturnToIdentityPicker
              ? () => this.backToAuthenticationIdentityPicker()
              : null
          }
          preventExit={this.state.preventExit}
          loading={this.state.loading}
          sendModal={this.props.sendModal}
          setLoading={(loading, preventExit) =>
            this.setLoading(loading, preventExit)
          }
          setPreventExit={preventExit => this.setPreventExit(preventExit)}
          updateSendFormData={(key, value) =>
            this.updateSendFormData(key, value)
          }
        />
      </OnboardingThemeProvider>
    );
  }

  const isIdentitySafetyModal =
    this.props.sendModal.type === REVOKE_IDENTITY_SEND_MODAL ||
    this.props.sendModal.type === RECOVER_IDENTITY_SEND_MODAL;

  const isInvoiceModal =
    this.props.sendModal.type === CONVERT_OR_CROSS_CHAIN_SEND_MODAL &&
    !!this.props.sendModal.data?.[SEND_MODAL_INVOICE_CONTEXT];

  if (isIdentitySafetyModal || isInvoiceModal) {
    const PortalHost = isInvoiceModal ? Portal.Host : React.Fragment;
    // A native modal is its own window. Android starts it below the status
    // bar, so the review must measure insets from inside the modal, not from
    // the app window. Otherwise it adds the status bar height a second time.
    const InsetsProvider = isInvoiceModal ? SafeAreaProvider : React.Fragment;
    const ThemeProvider = isInvoiceModal
      ? React.Fragment
      : OnboardingThemeProvider;
    return (
      <Modal
        animationType="slide"
        onRequestClose={() =>
          isInvoiceModal
            ? this.cancel()
            : this.handleIdentitySafetyRequestClose()
        }
        presentationStyle="fullScreen"
        visible={visible}>
        <ThemeProvider>
          <PortalHost>
            <InsetsProvider>
              <NavigationContainer
                key={this.props.sendModal.requestId || 'identity-safety-modal'}>
                {/* Native screens inside a native modal add a second iOS touch
                    handler, so every touch reaches JS twice and presses never
                    fire. Android modal windows cannot host screen fragments. */}
                <Root.Navigator
                  detachInactiveScreens={false}
                  screenOptions={{headerShown: false}}>
                  <Root.Screen name="IdentitySafetyModal">
                    {SendModalInnerAreaRender.call(this)}
                  </Root.Screen>
                </Root.Navigator>
              </NavigationContainer>
            </InsetsProvider>
          </PortalHost>
        </ThemeProvider>
      </Modal>
    );
  }

  return (
    <Portal>
      <NavigationContainer
        key={this.props.sendModal.requestId || 'send-modal-idle'}>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={() => this.cancel()}
          contentContainerStyle={{
            height:
              Platform.OS === 'android' ? modalStarterHeight : modalHeight,
            flex: 0,
            backgroundColor: 'white',
          }}>
          <SafeAreaView style={{flex: 1}}>
            <Root.Navigator
              detachInactiveScreens={false}
              screenOptions={{
                header: () => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: Colors.secondaryColor,
                    }}>
                    <TextAction
                      style={{alignSelf: 'center', marginBottom: 16}}
                      onPress={() => this.cancel()}
                      size="small"
                      themeMode="light"
                      disabled={this.state.preventExit}>
                      {'Close'}
                    </TextAction>
                    <Text
                      style={{
                        marginBottom: 16,
                        fontSize: 16,
                        textAlign: 'center',
                      }}>
                      {title}
                    </Text>
                    <TextAction
                      style={{alignSelf: 'center', marginBottom: 16}}
                      onPress={() => this.showHelpModal()}
                      size="small"
                      themeMode="light"
                      disabled={this.state.preventExit}>
                      {'Help'}
                    </TextAction>
                  </View>
                ),
                headerStyle: {
                  height: 52,
                },
              }}>
              <Root.Screen name="SendModalInner">
                {SendModalInnerAreaRender.call(this)}
              </Root.Screen>
            </Root.Navigator>
          </SafeAreaView>
        </SemiModal>
      </NavigationContainer>
    </Portal>
  );
};

export const SendModalInnerAreaRender = function () {
  const isIdentitySafetyModal =
    this.props.sendModal.type === REVOKE_IDENTITY_SEND_MODAL ||
    this.props.sendModal.type === RECOVER_IDENTITY_SEND_MODAL;
  const isInvoiceModal =
    this.props.sendModal.type === CONVERT_OR_CROSS_CHAIN_SEND_MODAL &&
    !!this.props.sendModal.data?.[SEND_MODAL_INVOICE_CONTEXT];
  const keepScreensMounted = isIdentitySafetyModal || isInvoiceModal;
  const starterProps = {
    cancel: () => this.cancel(),
    loading: this.state.loading,
    updateSendFormData: (key, value) => this.updateSendFormData(key, value),
    setLoading: loading => this.setLoading(loading),
    setModalHeight: height => this.setModalHeight(height),
    setIdentitySafetyRequestCloseHandler:
      this.setIdentitySafetyRequestCloseHandler,
    setPreventExit: preventExit => this.setPreventExit(preventExit),
    setVisible: visible => this.setVisible(visible),
  };

  const Form =
    (!keepScreensMounted && this.state.loading) ||
    SEND_FORMS[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_FORMS[this.props.sendModal.type];

  const Confirmation =
    (!keepScreensMounted && this.state.loading) ||
    SEND_CONFIRMATION[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_CONFIRMATION[this.props.sendModal.type];

  const Result =
    (!isInvoiceModal && this.state.loading) ||
    SEND_RESULTS[this.props.sendModal.type] == null
      ? AnimatedActivityIndicatorBox
      : SEND_RESULTS[this.props.sendModal.type];

  return () => (
    <View style={{flex: 1}}>
      <View
        style={{flex: 1}}
        pointerEvents={isInvoiceModal && this.state.loading ? 'none' : 'auto'}
        accessibilityElementsHidden={isInvoiceModal && this.state.loading}
        importantForAccessibility={
          isInvoiceModal && this.state.loading ? 'no-hide-descendants' : 'auto'
        }>
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
            tabBarPressColor: 'transparent',
            tabBarPressOpacity: 1,
            tabBarLabelStyle: {
              fontSize: 12,
            },
            tabBarStyle: keepScreensMounted ? {display: 'none'} : undefined,
            lazy: true,
            lazyPlaceholder: () => <AnimatedActivityIndicatorBox />,
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
      </View>
      {isInvoiceModal && this.state.loading && (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <InvoicePaymentLoading
            sending={this.state.preventExit}
            onClose={() => this.cancel()}
          />
        </View>
      )}
    </View>
  );
};
