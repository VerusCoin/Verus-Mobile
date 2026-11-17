import React, {useEffect, useMemo, useRef} from 'react';
import {AccessibilityInfo, Animated, Platform, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../AppButton';
import SafeBottomActionStack from '../SafeBottomActionStack';
import useReduceMotion from '../../hooks/useReduceMotion';
import {useButtonHeight} from '../../hooks/useButtonHeight';
import {nfcTapStyles as createStyles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import {triggerHaptic} from '../../utils/haptics/haptics';
import {NFC_TAP_PHASE} from '../../utils/walletBackup/nfcTapText';
import NfcTapSymbol from './NfcTapSymbol';

// iOS plays its own feedback when the scan sheet finds a card.
const PHASE_HAPTICS = {
  [NFC_TAP_PHASE.ACTIVE]: Platform.OS === 'android' ? 'impactLight' : null,
  [NFC_TAP_PHASE.DONE]: 'notificationSuccess',
  [NFC_TAP_PHASE.FAILED]: 'notificationError',
  [NFC_TAP_PHASE.NOTICE]: 'notificationWarning',
};

// One NFC card moment: the symbol, one line of text, and the actions for the
// current step. actions: [{label, onPress, variant, disabled, cancel}].
export default function NfcTapView({
  phase,
  title,
  detail,
  actions = [],
  includeTopInset = false,
  testID,
}) {
  const theme = useAppTheme();
  const buttonHeight = useButtonHeight();
  const styles = useMemo(() => createStyles(theme, buttonHeight), [theme, buttonHeight]);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const textOpacity = useRef(new Animated.Value(1)).current;
  const lastPhaseRef = useRef(null);

  useEffect(() => {
    if (phase === lastPhaseRef.current) return;
    lastPhaseRef.current = phase;

    const haptic = PHASE_HAPTICS[phase];
    if (haptic) triggerHaptic(haptic);
  }, [phase]);

  useEffect(() => {
    if (reduceMotion) {
      textOpacity.setValue(1);
      return undefined;
    }

    textOpacity.setValue(0);
    const fadeIn = Animated.timing(textOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    fadeIn.start();

    return () => fadeIn.stop();
  }, [reduceMotion, textOpacity, title]);

  // Android reads the live region. iOS needs an announcement.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !title) return;
    AccessibilityInfo.announceForAccessibility(
      detail ? `${title}. ${detail}` : title,
    );
  }, [detail, title]);

  const renderAction = action => {
    const primary = action.variant === 'primary';

    return (
      <AppButton
        buttonColor={primary ? undefined : theme.colors.surfaceMuted}
        disabled={action.disabled}
        height={buttonHeight}
        key={action.label}
        onPress={action.onPress}
        testID={action.testID}
        textColor={
          primary
            ? undefined
            : theme.isDark
            ? theme.colors.textPrimary
            : theme.colors.primary
        }
        variant={primary ? 'primary' : 'secondary'}>
        {action.label}
      </AppButton>
    );
  };

  return (
    <View
      style={[
        styles.container,
        includeTopInset && {paddingTop: insets.top},
      ]}
      testID={testID}>
      <View
        style={[
          styles.body,
          Platform.OS === 'ios' ? styles.bodyTop : styles.bodyCentered,
        ]}>
        <NfcTapSymbol phase={phase} />
        <Animated.View style={[styles.text, {opacity: textOpacity}]}>
          {title ? (
            <Text accessibilityLiveRegion="polite" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </Animated.View>
      </View>
      <SafeBottomActionStack gap={0} horizontalSpacing={24}>
        <View style={styles.actions}>{actions.map(renderAction)}</View>
      </SafeBottomActionStack>
    </View>
  );
}
