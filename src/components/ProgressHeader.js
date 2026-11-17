import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../theme/app';
import HeaderCloseButton from './HeaderCloseButton';
import OnboardingBackButton from './OnboardingBackButton';
import {progressHeaderStyles as headerStyles} from '../styles';
import {PROGRESS_HEADER_METRICS} from '../styles/components/progressHeader.styles';

const ProgressHeader = ({
  backDisabled = false,
  borderless = false,
  closeLabel,
  showBack = true,
  showProgress = true,
  onBack,
  onClose,
  progress = 0.25,
  rightAction,
  title,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const animatedProgress = useRef(new Animated.Value(clampedProgress)).current;
  const progressWidth = useMemo(
    () =>
      animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [animatedProgress],
  );

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

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
        if (active) {
          animatedProgress.setValue(clampedProgress);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }
    };
  }, [animatedProgress, clampedProgress]);

  return (
    <View
      style={[
        headerStyles.container,
        borderless && {borderBottomWidth: 0},
        {
          paddingTop: insets.top + PROGRESS_HEADER_METRICS.top,
          paddingLeft: insets.left + PROGRESS_HEADER_METRICS.horizontal,
          paddingRight: insets.right + PROGRESS_HEADER_METRICS.horizontal,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <View style={headerStyles.actionRow}>
        {showBack ? (
          <OnboardingBackButton
            disabled={backDisabled}
            onPress={onBack}
            style={styles.backButtonOffset}
          />
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
        {title ? (
          <>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[
                styles.title,
                theme.typography.titleSheet,
                {color: theme.colors.textPrimary},
              ]}>
              {title}
            </Text>
            {onClose ? (
              <HeaderCloseButton
                accessibilityLabel={closeLabel}
                onPress={onClose}
                style={styles.closeButtonOffset}
              />
            ) : (
              <View style={styles.actionSlot}>{rightAction}</View>
            )}
          </>
        ) : null}
      </View>
      {showProgress ? (
        <View
          accessibilityLabel={`${Math.round(clampedProgress * 100)}% complete`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(clampedProgress * 100),
          }}
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  actionPlaceholder: {
    // Mirrors actionSlot's -8 offset so a title without Back stays centered.
    marginLeft: -8,
    width: 44,
    height: 44,
  },
  actionSlot: {
    marginRight: -8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonOffset: {
    marginLeft: -8,
  },
  closeButtonOffset: {
    marginRight: -8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});

export default ProgressHeader;
