import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../components/AppButton';
import {getBiometryPresentation} from '../../../../components/BiometricAffordanceIcon';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import StepGlyph from '../../../../components/StepGlyph';
import {createSignedOutFlowStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {useOnboardingSmallDeviceLayout} from '../../../../hooks/useOnboardingSmallDeviceLayout';

const CONTENT_ANIMATION_DURATION = 320;

export default function UseBiometrics({
  supportedBiometryType,
  setUseBiometrics,
  onNext,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const presentation = getBiometryPresentation(supportedBiometryType);
  const BiometryIcon = presentation.icon;
  const contentProgress = useRef(new Animated.Value(0)).current;
  const {smallDevice} = useOnboardingSmallDeviceLayout();

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

  const continueToWalletSetup = useBiometrics => {
    setUseBiometrics(useBiometrics);
    if (onNext) {
      onNext();
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

  return (
    <View style={signedOutFlowStyles.container}>
      <View
        style={[
          signedOutFlowStyles.content,
          smallDevice && signedOutFlowStyles.contentSmallDevice,
        ]}>
        <Animated.View
          style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
          <StepGlyph icon={BiometryIcon} />
          <Text
            style={[
              signedOutFlowStyles.title,
              smallDevice && signedOutFlowStyles.titleSmallDevice,
              styles.title,
            ]}>
            {presentation.onboardingTitle}
          </Text>
          <Text style={signedOutFlowStyles.body}>
            {presentation.onboardingBody}
          </Text>
        </Animated.View>
      </View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          accessibilityLabel={`Turn on ${presentation.settingsTitle}`}
          height={56}
          onPress={() => continueToWalletSetup(true)}
          testID="onboarding.biometrics.enable"
          variant="primary">
          {'Turn on'}
        </AppButton>
        <AppButton
          height={56}
          onPress={() => continueToWalletSetup(false)}
          testID="onboarding.biometrics.skip"
          variant="secondary">
          {'Skip for now'}
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 14,
  },
});
