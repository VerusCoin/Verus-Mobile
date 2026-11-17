import {useRequestBackHandler} from '../useRequestNavigation';
import React, {useEffect, useMemo, useRef} from 'react';
import {Animated} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {SendWizardProvider} from '../../SendWizard/SendWizardContext';
import SendWizardAmount from '../../SendWizard/SendWizardAmount';
import SendWizardConfirm from '../../SendWizard/SendWizardConfirm';
import SendWizardRecipient from '../../SendWizard/SendWizardRecipient';
import SendWizardSuccess from '../../SendWizard/SendWizardSuccess';
import SendWizardHeader from '../../SendWizard/components/SendWizardHeader';
import {InvoiceFlowContext} from '../../SendWizard/invoiceFlow';
import {
  SEND_WIZARD_MODE,
  WIZARD_CONTEXT_STEP,
} from '../../SendWizard/wizardUtils';
import InvoicePayWith from './InvoicePayWith';

const Stack = createStackNavigator();

// Pays a VerusPay invoice with the Send screens: Pay with, then the same
// Confirm and Sent as every other payment (owner decision, 2026-10-21).
// Amount and Recipient appear only when the invoice leaves them open. The
// flow ends through `flow.onExit` (back or close) or `flow.onPaid` (Done).
const InvoicePayFlow = ({flow, onOpenInAnotherApp, onHeaderVisibilityChange}) => {
  useEffect(() => {
    onHeaderVisibilityChange?.(true);
    return () => onHeaderVisibilityChange?.(false);
  }, [onHeaderVisibilityChange]);
  const invoiceNavigation = useRef(null);
  useRequestBackHandler(() => {
    const navigation = invoiceNavigation.current;
    const state = navigation?.getState();
    const route = state?.routes[state.index];
    if (route?.name === 'SendWizardSuccess') flow.onPaid();
    else if (state?.index > 0) navigation.goBack();
    else flow.onExit();
  }, flow.responsePending);
  const theme = useOnboardingTheme();
  const {anyAmount, anyDestination} = flow.invoice;
  const steps = useMemo(
    () =>
      [
        'InvoicePayWith',
        anyAmount && 'SendWizardAmount',
        anyDestination && 'SendWizardRecipient',
        'SendWizardConfirm',
      ].filter(Boolean),
    [anyAmount, anyDestination],
  );
  const progressFor = name =>
    name === 'SendWizardSuccess'
      ? 1
      : (Math.max(steps.indexOf(name), 0) + 1) / steps.length;
  const progressAnimation = useRef({
    generation: 0,
    value: new Animated.Value(1 / steps.length),
  }).current;
  const initialState = useRef({invoice: flow.invoice}).current;

  return (
    <InvoiceFlowContext.Provider value={{...flow, onOpenInAnotherApp}}>
      <SendWizardProvider initialState={initialState} mode={SEND_WIZARD_MODE.SEND}>
        <Stack.Navigator
          initialRouteName="InvoicePayWith"
          screenListeners={({route, navigation}) => ({
            focus: () => {
              invoiceNavigation.current = navigation;
              onHeaderVisibilityChange?.(route.name !== 'SendWizardSuccess');
            },
          })}
          screenOptions={() => ({
            title: '',
            cardStyle: {backgroundColor: theme.colors.background},
            header: ({navigation, options, route}) => (
              <SendWizardHeader
                contextStep={
                  route.name === 'SendWizardAmount'
                    ? WIZARD_CONTEXT_STEP.AMOUNT
                    : null
                }
                title={options.title}
                disabled={Boolean(options.wizardNavigationDisabled)}
                onBack={
                  options.wizardBackHidden
                    ? undefined
                    : options.wizardOnBack || (() =>
                        navigation.canGoBack() ? navigation.goBack() : flow.onExit())
                }
                onClose={flow.onExit}
                progress={progressFor(route.name)}
                progressAnimation={progressAnimation}
              />
            ),
          })}>
          <Stack.Screen
            name="InvoicePayWith"
            component={InvoicePayWith}
            options={{title: 'Pay with'}}
          />
          <Stack.Screen
            name="SendWizardAmount"
            component={SendWizardAmount}
            options={{title: 'Amount'}}
          />
          <Stack.Screen
            name="SendWizardRecipient"
            component={SendWizardRecipient}
            options={{title: 'Recipient'}}
          />
          <Stack.Screen
            name="SendWizardConfirm"
            component={SendWizardConfirm}
            options={{title: 'Confirm'}}
          />
          <Stack.Screen
            name="SendWizardSuccess"
            component={SendWizardSuccess}
            options={{gestureEnabled: false, headerShown: false}}
          />
        </Stack.Navigator>
      </SendWizardProvider>
    </InvoiceFlowContext.Provider>
  );
};


export default InvoicePayFlow;
