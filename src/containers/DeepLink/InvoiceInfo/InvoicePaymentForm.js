import React, {useState} from 'react';
import {Keyboard, KeyboardAvoidingView, Platform, View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import ProgressHeader from '../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_TO_ADDRESS_FIELD,
} from '../../../utils/constants/sendModal';
import {
  InvoiceErrorLine,
  InvoiceRow,
  useInvoiceStyles,
} from './InvoicePaymentParts';

const InvoicePaymentForm = ({
  sendModal,
  updateSendFormData,
  // Field problems: {amount, destination, form}. `form` shows above the action.
  errors = {},
  onContinue,
  onBack,
}) => {
  const {styles} = useInvoiceStyles();
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const {data, coinObj, subWallet} = sendModal;
  const disabled = data[SEND_MODAL_DISABLED_INPUTS] || {};
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <View
        onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <ProgressHeader
          title="Pay invoice"
          borderless
          progress={0.4}
          showBack
          onBack={onBack}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {paddingBottom: footerHeight + 24},
          ]}
          keyboardShouldPersistTaps="handled"
          contentInset={{bottom: 0}}
          extraHeight={headerHeight + 48}
          extraScrollHeight={footerHeight}>
          <Text accessibilityRole="header" style={styles.title}>
            Payment details
          </Text>
          <View style={styles.form}>
            {disabled[SEND_MODAL_AMOUNT_FIELD] ? (
              <InvoiceRow
                label="Amount"
                value={`${data[SEND_MODAL_AMOUNT_FIELD]} ${coinObj.display_ticker}`}
              />
            ) : (
              <AppTextInput
                label={`Amount in ${coinObj.display_ticker}`}
                accessibilityLabel={`Amount in ${coinObj.display_ticker}`}
                value={data[SEND_MODAL_AMOUNT_FIELD]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                errorText={errors.amount}
                onChangeText={value =>
                  updateSendFormData(SEND_MODAL_AMOUNT_FIELD, value)
                }
              />
            )}
            {disabled[SEND_MODAL_TO_ADDRESS_FIELD] ? (
              <InvoiceRow
                label="To"
                value={data[SEND_MODAL_TO_ADDRESS_FIELD]}
              />
            ) : (
              <AppTextInput
                label="Destination"
                accessibilityLabel="Destination address or VerusID"
                placeholder="Address or VerusID@"
                value={data[SEND_MODAL_TO_ADDRESS_FIELD]}
                errorText={errors.destination}
                onChangeText={value =>
                  updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, value)
                }
              />
            )}
            <InvoiceRow label="From" value={subWallet.name} />
          </View>
        </KeyboardAwareScrollView>
        <View
          onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}>
          <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
            <InvoiceErrorLine>{errors.form}</InvoiceErrorLine>
            <AppButton
              onPress={() => {
                Keyboard.dismiss();
                onContinue();
              }}>
              Review payment
            </AppButton>
            <AppButton variant="secondary" onPress={onBack}>
              Back to invoice
            </AppButton>
          </SafeBottomActionStack>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InvoicePaymentForm;
