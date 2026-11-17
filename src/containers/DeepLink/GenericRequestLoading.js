import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StatusBar, StyleSheet, Text, View} from 'react-native';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../theme/onboarding';
import {fontStyle} from '../../globals/fonts';

export const GENERIC_REQUEST_LOADING_STEPS = {
  READ: 'read',
  NETWORK: 'network',
  SIGNER: 'signer',
  REVIEW: 'review',
};

const STEPS = [
  {
    key: GENERIC_REQUEST_LOADING_STEPS.READ,
    label: 'Read request',
  },
  {
    key: GENERIC_REQUEST_LOADING_STEPS.NETWORK,
    label: 'Select network',
  },
  {
    key: GENERIC_REQUEST_LOADING_STEPS.SIGNER,
    label: 'Verify signer',
  },
  {
    key: GENERIC_REQUEST_LOADING_STEPS.REVIEW,
    label: 'Prepare review',
  },
];

// Other requests reuse the screen with their own title and steps, such as a
// VerusPay invoice ("Opening invoice", no "Verify signer" when unsigned).
export const createRequestLoadingSteps = (labels = {}, skip = []) =>
  STEPS.filter(step => !skip.includes(step.key)).map(step => ({
    ...step,
    label: labels[step.key] || step.label,
  }));

const getStepState = (steps, activeStep, index) => {
  const activeIndex = Math.max(
    steps.findIndex(step => step.key === activeStep),
    0,
  );

  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'current';

  return 'pending';
};

const StepSpinner = ({styles}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.currentSpinner,
        {
          transform: [{rotate}],
        },
      ]}
    />
  );
};

const GenericRequestLoadingContent = ({
  activeStep,
  error,
  onCancel,
  onRetry,
  steps = STEPS,
  title = 'Opening request',
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (error != null) {
    return (
      <View style={styles.root}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.content}>
          <Text style={styles.title}>{error.title}</Text>
          <Text style={[styles.status, styles.errorMessage]}>
            {error.message}
          </Text>
        </View>
        <SafeBottomActionStack gap={10}>
          {error.canRetry && onRetry != null && (
            <AppButton
              onPress={onRetry}
              variant="primary"
              height={56}
              themeMode={theme.mode}>
              {'Try again'}
            </AppButton>
          )}
          <AppButton
            onPress={onCancel}
            variant="secondary"
            height={56}
            themeMode={theme.mode}>
            {'Close'}
          </AppButton>
        </SafeBottomActionStack>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.content}>
        <LottieView
          source={require('../../animations/loading_7bars.json')}
          autoPlay
          loop
          style={styles.animation}
        />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.status}>{'Verifying'}</Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Verifying request"
          style={styles.steps}>
          {steps.map((step, index) => {
            const stepState = getStepState(steps, activeStep, index);

            return (
              <View key={step.key} style={styles.step}>
                <View style={styles.stepIcon}>
                  {stepState === 'done' ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={22}
                      color={theme.colors.success}
                    />
                  ) : stepState === 'current' ? (
                    <StepSpinner styles={styles} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    stepState === 'pending' && styles.pendingStepLabel,
                  ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          onPress={onCancel}
          variant="secondary"
          height={56}
          themeMode={theme.mode}>
          {'Cancel'}
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
};

const GenericRequestLoading = props => (
  <OnboardingThemeProvider>
    <GenericRequestLoadingContent {...props} />
  </OnboardingThemeProvider>
);

const createStyles = theme =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
    },
    animation: {
      width: 132,
      height: 96,
      marginBottom: 26,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      lineHeight: 31,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    status: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 30,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    errorMessage: {
      marginBottom: 0,
    },
    steps: {
      width: '100%',
      gap: 13,
    },
    step: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepIcon: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    pendingDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.borderStrong,
    },
    currentSpinner: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.isDark
        ? 'rgba(49, 101, 212, 0.24)'
        : 'rgba(49, 101, 212, 0.18)',
      borderTopColor: theme.colors.primary,
    },
    stepLabel: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    pendingStepLabel: {
      color: theme.colors.textSubtle,
    },
  });

export default GenericRequestLoading;
