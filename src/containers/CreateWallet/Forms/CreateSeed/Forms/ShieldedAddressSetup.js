import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppSwitch from '../../../../../components/AppSwitch';
import {ShieldCheck} from 'lucide-react-native';
import AppButton from '../../../../../components/AppButton';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import StepGlyph from '../../../../../components/StepGlyph';
import {fontStyle} from '../../../../../globals/fonts';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {useOnboardingSmallDeviceLayout} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import CompactSetupHeader from '../../../../Onboard/components/CompactSetupHeader';

const CONTENT_ANIMATION_DURATION = 240;

export default function ShieldedAddressSetup({
  actionLabel = 'Create wallet',
  body = 'Use it for private transactions and encryption capabilities. Recommended.',
  navigation,
  onBack,
  onComplete,
  optionLabel = 'Create shielded address',
  progress = 1,
  showHeader = true,
  title = 'Shielded address',
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [createShieldedAddress, setCreateShieldedAddress] = useState(true);
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

  const back = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const animatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  return (
    <View style={signedOutFlowStyles.container}>
      {showHeader ? (
        <CompactSetupHeader onBack={back} progress={progress} />
      ) : null}
      <Animated.View
        style={[
          signedOutFlowStyles.content,
          smallDevice && signedOutFlowStyles.contentSmallDevice,
          animatedStyle,
        ]}>
        <View style={signedOutFlowStyles.form}>
          <StepGlyph icon={ShieldCheck} />
          <Text
            style={[
              signedOutFlowStyles.title,
              smallDevice && signedOutFlowStyles.titleSmallDevice,
              styles.title,
            ]}>
            {title}
          </Text>
          <Text style={signedOutFlowStyles.body}>{body}</Text>
          <View style={styles.enabledRow}>
            <Text style={styles.enabledText}>{optionLabel}</Text>
            <AppSwitch
              color={theme.colors.success}
              onValueChange={setCreateShieldedAddress}
              value={createShieldedAddress}
            />
          </View>
        </View>
      </Animated.View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          height={56}
          onPress={() => onComplete(createShieldedAddress)}
          testID="onboarding.shielded.complete"
          variant="primary">
          {actionLabel}
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
}

const createStyles = theme =>
  StyleSheet.create({
  title: {
    marginBottom: 14,
  },
  enabledRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enabledText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
});
