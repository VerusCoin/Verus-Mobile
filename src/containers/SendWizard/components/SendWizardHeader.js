import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import HeaderCloseButton from '../../../components/HeaderCloseButton';
import OnboardingBackButton from '../../../components/OnboardingBackButton';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {SEND_WIZARD_MODE} from '../wizardUtils';
import WizardContextBand from './WizardContextBand';
import {progressHeaderStyles as headerStyles} from '../../../styles';
import {PROGRESS_HEADER_METRICS} from '../../../styles/components/progressHeader.styles';

const FLOW_STEPS = {
  [SEND_WIZARD_MODE.SEND]: {
    manual: [
      'SendWizardSelectSource',
      'SendWizardAmount',
      'SendWizardRecipient',
      'SendWizardConfirm',
    ],
    selected: [
      'SendWizardAmount',
      'SendWizardRecipient',
      'SendWizardConfirm',
    ],
  },
  [SEND_WIZARD_MODE.CONVERT]: {
    manual: [
      'SendWizardSelectSource',
      'SendWizardSelectTarget',
      'SendWizardAmount',
      'SendWizardRecipient',
      'SendWizardConfirm',
    ],
    selected: [
      'SendWizardSelectTarget',
      'SendWizardAmount',
      'SendWizardRecipient',
      'SendWizardConfirm',
    ],
  },
};

// A scanned recipient skips the Recipient step, so it does not count.
export const getSendWizardProgress = (
  routeName,
  mode = SEND_WIZARD_MODE.SEND,
  hasInitialSource = false,
  recipientFixed = false,
) => {
  if (routeName === 'SendWizardSuccess') return 1;

  const modeSteps = FLOW_STEPS[mode] || FLOW_STEPS[SEND_WIZARD_MODE.SEND];
  const flowSteps = hasInitialSource ? modeSteps.selected : modeSteps.manual;
  const steps = recipientFixed
    ? flowSteps.filter(step => step !== 'SendWizardRecipient')
    : flowSteps;
  const stepIndex = steps.indexOf(routeName);

  return (Math.max(stepIndex, 0) + 1) / steps.length;
};

const SendWizardHeader = ({
  contextStep,
  disabled = false,
  onBack,
  onClose,
  rightAccessory,
  progress,
  progressAnimation: sharedProgressAnimation,
  title,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const isFocused = useIsFocused();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const progressPercent = Math.round(clampedProgress * 100);
  const localProgressAnimation = useRef({
    generation: 0,
    value: new Animated.Value(clampedProgress),
  }).current;
  const progressAnimation =
    sharedProgressAnimation || localProgressAnimation;
  const animatedProgress = progressAnimation.value;
  const progressWidth = useMemo(
    () =>
      animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [animatedProgress],
  );

  useEffect(() => {
    // Stack headers stay mounted on Back. Only the focused step owns the
    // shared animation, and it must restore its value when focused again.
    if (!isFocused) return undefined;

    let active = true;
    let animation;
    const generation = progressAnimation.generation + 1;
    progressAnimation.generation = generation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active || progressAnimation.generation !== generation) return;

        animatedProgress.stopAnimation();

        if (reduceMotionEnabled) {
          animatedProgress.setValue(clampedProgress);
          return;
        }

        animation = Animated.timing(animatedProgress, {
          toValue: clampedProgress,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        });
        animation.start();
      })
      .catch(() => {
        if (active && progressAnimation.generation === generation) {
          animatedProgress.setValue(clampedProgress);
        }
      });

    return () => {
      active = false;

      if (animation && progressAnimation.generation === generation) {
        animation.stop();
      }
    };
  }, [animatedProgress, clampedProgress, isFocused, progressAnimation]);

  const header = (
    <View
      style={[
        headerStyles.container,
        {
          paddingTop: insets.top + PROGRESS_HEADER_METRICS.top,
          paddingLeft: insets.left + PROGRESS_HEADER_METRICS.horizontal,
          paddingRight: insets.right + PROGRESS_HEADER_METRICS.horizontal,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <View style={[headerStyles.actionRow, styles.actionRow]}>
        {onBack ? (
          <OnboardingBackButton
            disabled={disabled}
            onPress={onBack}
            style={[styles.backButton, disabled && styles.disabled]}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {/* Balances the right accessory, so the title stays centered. */}
        {rightAccessory ? <View style={styles.accessorySpacer} /> : null}
        {title ? (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.title,
              theme.typography.titleSheet,
              {color: theme.colors.textPrimary},
            ]}>
            {title}
          </Text>
        ) : null}
        <View style={styles.rightActions}>
          {rightAccessory}
          <HeaderCloseButton
            accessibilityLabel="Close transfer"
            disabled={disabled}
            onPress={onClose}
            style={[styles.closeButton, disabled && styles.disabled]}
          />
        </View>
      </View>
      <View
        accessibilityLabel={`Transfer ${progressPercent}% complete`}
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: progressPercent}}
        style={[
          headerStyles.progressTrack,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <Animated.View
          style={[
            headerStyles.progressFill,
            {
              width: progressWidth,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );

  if (!contextStep) return header;

  return (
    <>
      {header}
      <WizardContextBand step={contextStep} />
    </>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginLeft: -8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: -8,
  },
  headerSpacer: {
    width: 44,
    height: 44,
    marginLeft: -8,
  },
  accessorySpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default SendWizardHeader;
