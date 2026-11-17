import React, {useEffect, useState} from 'react';
import {Keyboard, Pressable, StyleSheet, Text, View} from 'react-native';
import AppTextInput from '../../components/AppTextInput';
import {useOnboardingTheme} from '../../theme/onboarding';
import {SettingsSwitchRow} from '../Settings/components/SettingsScaffold';
import {sanitizeNumericInput, validateSlippageInput} from './receiveInvoice';
import ReceiveRequestSheet from './ReceiveRequestSheet';

const PRESETS = ['0.5', '1', '2'];
const selectionFor = value => PRESETS.includes(sanitizeNumericInput(value))
  ? sanitizeNumericInput(value) : 'custom';

const ReceiveConversionsSheet = ({
  allowConversion,
  maxSlippage,
  onApply,
  onClose,
  ticker,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const [allowed, setAllowed] = useState(allowConversion);
  const [slippage, setSlippage] = useState(maxSlippage);
  const [selection, setSelection] = useState(() => selectionFor(maxSlippage));
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!visible) return;
    setAllowed(allowConversion);
    setSlippage(maxSlippage);
    setSelection(selectionFor(maxSlippage));
    setError(null);
  }, [allowConversion, maxSlippage, visible]);

  return (
    <ReceiveRequestSheet
      onApply={() => {
        const value = sanitizeNumericInput(slippage);
        const nextError = allowed ? validateSlippageInput(value) : null;
        setError(nextError);
        if (nextError) return null;
        return () => onApply({allowConversion: allowed, maxSlippage: value});
      }}
      onClose={onClose}
      title="Conversions"
      visible={visible}>
      <SettingsSwitchRow
        description={`Senders can pay with currencies that convert to ${ticker}.`}
        descriptionNumberOfLines={0}
        last
        onValueChange={value => {
          Keyboard.dismiss();
          setAllowed(value);
          setError(null);
        }}
        title="Allow conversions"
        value={allowed}
      />
      {allowed ? (
        <View style={styles.slippage}>
          <Text style={[theme.typography.labelMd, styles.heading, {color: theme.colors.textPrimary}]}>
            Max slippage
          </Text>
          <View style={styles.segments}>
            {[...PRESETS, 'custom'].map(value => {
              const selected = selection === value;
              const label = value === 'custom' ? 'Custom' : `${value}%`;
              return (
                <Pressable
                  accessibilityLabel={value === 'custom' ? 'Custom max slippage' : `Max slippage ${label}`}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  key={value}
                  onPress={() => {
                    setSelection(value);
                    setError(null);
                    if (value !== 'custom') {
                      Keyboard.dismiss();
                      setSlippage(value);
                    }
                  }}
                  style={({pressed}) => [
                    styles.segment,
                    {
                      borderRadius: theme.rounded.md,
                      backgroundColor: selected ? theme.colors.primaryBackground : theme.colors.surfaceMuted,
                      borderColor: selected ? theme.colors.link : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[theme.typography.labelMd, {color: theme.colors.textPrimary}]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selection === 'custom' ? (
            <AppTextInput
              accessibilityLabel="Custom max slippage, percent"
              containerStyle={styles.custom}
              errorText={error}
              keyboardType="decimal-pad"
              onChangeText={value => {
                setSlippage(sanitizeNumericInput(value));
                setError(null);
              }}
              rightAccessory={<Text style={[theme.typography.inputValue, {color: theme.colors.textSecondary}]}>%</Text>}
              value={slippage}
            />
          ) : null}
          <Text style={[theme.typography.caption, styles.explanation, {color: theme.colors.textSecondary}]}>
            You accept up to this much less than the market price when a payment converts.
          </Text>
        </View>
      ) : null}
    </ReceiveRequestSheet>
  );
};

const styles = StyleSheet.create({
  slippage: {marginTop: 20},
  heading: {marginBottom: 8},
  segments: {flexDirection: 'row', gap: 8},
  segment: {flex: 1, minHeight: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  custom: {marginTop: 12},
  explanation: {marginTop: 10},
  pressed: {opacity: 0.72},
});
export default ReceiveConversionsSheet;
