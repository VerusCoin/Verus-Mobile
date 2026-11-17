import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Info} from 'lucide-react-native';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import KeyboardAvoidingForm from '../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../globals/fonts';
import scorePassword from '../../../../utils/auth/scorePassword';
import {
  MIN_PASS_LENGTH,
  MIN_PASS_SCORE,
  PASS_SCORE_LIMIT,
} from '../../../../utils/constants/constants';
import AppTextInput from '../../../../components/AppTextInput';
import {
  createSignedOutFlowStyles,
  createSignedOutSheetStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../hooks/useOnboardingSmallDeviceLayout';

const passwordAutofillProps = Platform.select({
  ios: {
    textContentType: 'oneTimeCode',
    spellCheck: false,
  },
  default: {
    autoComplete: 'off',
    importantForAutofill: 'no',
    textContentType: 'none',
    spellCheck: false,
  },
});

const strengthLabels = {
  2: 'Weak',
  3: 'Mediocre',
  4: 'Good',
  5: 'Excellent',
};
const CONTENT_ANIMATION_DURATION = 320;

const PasswordStrengthMeter = ({color, label, level, styles, textColor}) => (
  <View style={styles.strengthContainer}>
    <View style={styles.strengthBars}>
      {[0, 1, 2, 3, 4].map(index => (
        <View
          key={index}
          style={[
            styles.strengthBar,
            index < level && {
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
    {label ? (
      <Text style={[styles.strengthLabel, {color: textColor}]}>{label}</Text>
    ) : null}
  </View>
);

// The step's info button sits in the progress header, right of the title.
export function PasswordInfoButton({onPress}) {
  const theme = useOnboardingTheme();

  return (
    <TouchableOpacity
      accessibilityLabel="About this password"
      accessibilityRole="button"
      accessibilityHint="Opens information about wallet password recovery"
      activeOpacity={0.72}
      hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={infoButtonStyles.button}>
      <Info color={theme.colors.textPrimary} size={23} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

export default function CreatePassword({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onNext,
  infoVisible = false,
  onCloseInfo,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [passwordScore, setPasswordScore] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const confirmPasswordRef = useRef(null);
  const formScrollRef = useRef(null);
  const focusedFieldRef = useRef(null);
  const fieldLayoutsRef = useRef({});
  const formTopRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const revealFrameRef = useRef(null);
  const contentProgress = useRef(new Animated.Value(0)).current;
  const {keyboardVisible} = useOnboardingSmallDeviceLayout();

  const revealFocusedField = useCallback(() => {
    if (revealFrameRef.current != null) {
      cancelAnimationFrame(revealFrameRef.current);
      revealFrameRef.current = null;
    }
    if (!keyboardVisible) return;

    revealFrameRef.current = requestAnimationFrame(() => {
      revealFrameRef.current = null;
      const field = fieldLayoutsRef.current[focusedFieldRef.current];
      const viewport = viewportHeightRef.current;
      if (!field || viewport <= 0) return;

      // Include the field's label and message, not the other password field.
      const top = formTopRef.current + field.y;
      const bottom = top + field.height;
      formScrollRef.current?.scrollTo({
        y: Math.max(
          0,
          Math.min(top, Math.max(scrollOffsetRef.current, bottom - viewport)),
        ),
        animated: false,
      });
    });
  }, [keyboardVisible]);

  useEffect(() => {
    revealFocusedField();
    return () => {
      if (revealFrameRef.current != null) {
        cancelAnimationFrame(revealFrameRef.current);
      }
    };
  }, [revealFocusedField]);

  const recordFieldLayout = (field, event) => {
    fieldLayoutsRef.current[field] = event.nativeEvent.layout;
    revealFocusedField();
  };
  const focusField = field => {
    focusedFieldRef.current = field;
    revealFocusedField();
  };

  useEffect(() => {
    if (!password) {
      setPasswordScore(0);
    } else {
      setPasswordScore(
        scorePassword(password, MIN_PASS_LENGTH, PASS_SCORE_LIMIT),
      );
    }
  }, [password]);

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        contentProgress.stopAnimation();

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: CONTENT_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  const strengthLevel = useMemo(() => {
    if (!password) return 0;
    if (passwordScore < MIN_PASS_SCORE) return 2;

    const passableRange = PASS_SCORE_LIMIT - MIN_PASS_SCORE;
    const adjustedScore = Math.max(
      0,
      Math.min(1, (passwordScore - MIN_PASS_SCORE) / passableRange),
    );

    return Math.min(5, 3 + Math.ceil(adjustedScore * 2));
  }, [password, passwordScore]);

  const strengthColor = useMemo(() => {
    if (strengthLevel <= 2) return theme.colors.warning;
    if (strengthLevel === 3) return theme.colors.textSecondary;
    if (strengthLevel === 4) return theme.colors.primary;
    return theme.colors.success;
  }, [strengthLevel, theme]);

  const strengthTextColor = strengthLevel <= 2
    ? theme.colors.warningText
    : strengthLevel >= 5
    ? theme.colors.successText
    : strengthColor;
  const strengthLabel = password ? strengthLabels[strengthLevel] : null;
  const passwordsMatch = password === confirmPassword;
  const passwordStrongEnough =
    password.length > 0 && passwordScore >= MIN_PASS_SCORE;
  const confirmPasswordVisible = passwordStrongEnough;
  const canContinue =
    passwordStrongEnough && confirmPassword.length > 0 && passwordsMatch;
  const confirmError =
    confirmPasswordVisible && confirmPassword.length > 0 && !passwordsMatch
      ? 'Passwords do not match.'
      : null;

  useEffect(() => {
    if (!confirmPasswordVisible) {
      setShowConfirmPassword(false);
    }
  }, [confirmPasswordVisible]);

  const focusConfirmPassword = () => {
    if (confirmPasswordVisible) {
      confirmPasswordRef.current?.focus();
    }
  };
  const contentAnimatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  const validate = () => {
    const res = {valid: false, message: ''};

    if (!password || password.length < 1) {
      res.message = 'Please enter a password.';
      return res;
    } else if (passwordScore < MIN_PASS_SCORE) {
      res.message = 'Please enter a stronger password.';
      return res;
    } else if (!confirmPassword || confirmPassword.length < 1) {
      res.message = 'Please confirm your password.';
      return res;
    } else if (!passwordsMatch) {
      res.message = 'Password and confirm password do not match.';
      return res;
    }

    res.valid = true;
    return res;
  };

  // Continue and the keyboard submit wait for a valid form; this is a guard.
  const next = async () => {
    if (!validate().valid) return;

    if (onNext) {
      await onNext();
    }
  };

  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView
            ref={formScrollRef}
            bounces={false}
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              signedOutFlowStyles.afterHeaderTitle,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={revealFocusedField}
            onLayout={event => {
              viewportHeightRef.current = event.nativeEvent.layout.height;
              revealFocusedField();
            }}
            onScroll={event => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}>
            <Animated.View
              onLayout={event => {
                formTopRef.current = event.nativeEvent.layout.y;
                revealFocusedField();
              }}
              style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
              <View onLayout={event => recordFieldLayout('password', event)}>
                <AppTextInput
                  {...passwordAutofillProps}
                  label="Password"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                  onChangeText={setPassword}
                  onFocus={() => focusField('password')}
                  onSubmitEditing={focusConfirmPassword}
                  returnKeyType={confirmPasswordVisible ? 'next' : 'default'}
                  rightAccessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  secureTextEntry={!showPassword}
                  testID="onboarding.password.input"
                  value={password}
                  onRightPress={() => setShowPassword(value => !value)}
                />
                <PasswordStrengthMeter
                  color={strengthColor}
                  textColor={strengthTextColor}
                  label={strengthLabel}
                  level={strengthLevel}
                  styles={styles}
                />
              </View>
              {confirmPasswordVisible ? (
                <View
                  onLayout={event => recordFieldLayout('confirm', event)}
                  style={styles.confirmInput}>
                  <AppTextInput
                    {...passwordAutofillProps}
                    ref={confirmPasswordRef}
                    errorText={confirmError}
                    label="Confirm password"
                    enablesReturnKeyAutomatically
                    onChangeText={setConfirmPassword}
                    onFocus={() => focusField('confirm')}
                    onSubmitEditing={canContinue ? next : undefined}
                    returnKeyType="done"
                    rightAccessibilityLabel={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
                    secureTextEntry={!showConfirmPassword}
                    testID="onboarding.password.confirmInput"
                    value={confirmPassword}
                    onRightPress={() => setShowConfirmPassword(value => !value)}
                  />
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack
        bottomSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30
        }
        includeBottomInset={!keyboardVisible}
        safeAreaSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        <AppButton
          disabled={!canContinue}
          height={56}
          onPress={next}
          testID="onboarding.password.next"
          variant="primary">
          {'Next'}
        </AppButton>
      </SafeBottomActionStack>
      <BottomSheetModal
        visible={infoVisible}
        onClose={onCloseInfo}
        maxHeight="58%">
        <View style={styles.infoSheetBody}>
          <Text
            style={[
              signedOutSheetStyles.bodyText,
              styles.infoSheetTextFirst,
            ]}>
            {'This password encrypts your wallet locally on this device.'}
          </Text>
          <Text style={[signedOutSheetStyles.bodyText, styles.infoSheetText]}>
            {
              'If you forget it, Verus cannot recover it for you. You can restore access to your wallet with your Secret Recovery Phrase, which you will see in the next steps.'
            }
          </Text>
          <Text style={[signedOutSheetStyles.bodyText, styles.infoSheetText]}>
            {'Keep your Secret Recovery Phrase private and stored somewhere safe.'}
          </Text>
          <AppButton
            height={52}
            onPress={onCloseInfo}
            style={styles.infoSheetButton}
            variant="primary">
            {'I understand'}
          </AppButton>
        </View>
      </BottomSheetModal>
    </KeyboardAvoidingForm>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 32,
    },
    strengthContainer: {
      marginTop: 12,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 6,
    },
    strengthBar: {
      height: 5,
      flex: 1,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
    },
    strengthLabel: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    confirmInput: {
      marginTop: 22,
    },
    infoSheetBody: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },
    infoSheetText: {
      marginTop: 12,
    },
    infoSheetTextFirst: {
      marginTop: 0,
    },
    infoSheetButton: {
      marginTop: 22,
    },
  });

const infoButtonStyles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
