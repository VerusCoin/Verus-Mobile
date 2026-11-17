import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import {ChevronLeft} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const SHEET_MODES = {
  OPTIONS: 'options',
  CANCEL: 'cancel',
};
export const GIFT_CARD_CANCEL_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  READY: 'ready',
  PENDING: 'pending',
  EMPTY: 'empty',
  ERROR: 'error',
};
const HEADER_ROW_HEIGHT = 36;
const EXIT_ANIMATION_DURATION = 90;
const ENTER_ANIMATION_DURATION = 170;
const TRANSITION_DISTANCE = 14;

const getCancelStatusMessage = status => {
  if (status === GIFT_CARD_CANCEL_STATUS.CHECKING) {
    return 'Checking gift card…';
  }
  if (status === GIFT_CARD_CANCEL_STATUS.PENDING) {
    return 'Pending funding must confirm before this gift card can be canceled.';
  }
  if (status === GIFT_CARD_CANCEL_STATUS.EMPTY) {
    return 'This gift card has no funds or VerusIDs to redeem.';
  }
  if (status === GIFT_CARD_CANCEL_STATUS.ERROR) {
    return 'Unable to refresh this gift card. Check your connection and try again.';
  }

  return '';
};

const getCancelPrimaryPresentation = status => {
  if (status === GIFT_CARD_CANCEL_STATUS.CHECKING) {
    return {
      accessibilityLabel: 'Checking gift card',
      label: '',
      loading: true,
    };
  }

  if (status === GIFT_CARD_CANCEL_STATUS.ERROR) {
    return {
      accessibilityLabel: 'Retry gift card check',
      label: 'Retry',
      loading: false,
    };
  }

  return {
    accessibilityLabel: 'Review redemption',
    label: 'Review redemption',
    loading: false,
  };
};

const GiftCardOptionsSheet = ({actions, cancelStep, onClose, visible}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const [sheetMode, setSheetMode] = useState(SHEET_MODES.OPTIONS);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingActionRef = useRef(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const headerProgress = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const cancelStatus =
    cancelStep?.status || GIFT_CARD_CANCEL_STATUS.IDLE;
  const cancelStatusMessage = getCancelStatusMessage(cancelStatus);
  const cancelPrimaryPresentation =
    getCancelPrimaryPresentation(cancelStatus);

  useEffect(() => {
    if (visible) {
      setSheetMode(SHEET_MODES.OPTIONS);
      setIsTransitioning(false);
      contentOpacity.setValue(1);
      contentTranslateX.setValue(0);
      headerProgress.setValue(0);
    }
  }, [contentOpacity, contentTranslateX, headerProgress, visible]);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduceMotionEnabled => {
        reduceMotionRef.current = reduceMotionEnabled;
      },
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (active) {
          reduceMotionRef.current = reduceMotionEnabled;
        }
      })
      .catch(() => {
        reduceMotionRef.current = false;
      });

    return () => {
      active = false;
      subscription.remove();
      contentOpacity.stopAnimation();
      contentTranslateX.stopAnimation();
      headerProgress.stopAnimation();
    };
  }, [contentOpacity, contentTranslateX, headerProgress]);

  useEffect(() => {
    if (!visible || sheetMode !== SHEET_MODES.CANCEL) return;

    const statusAnnouncement = cancelStatusMessage
      ? ` ${cancelStatusMessage}`
      : '';
    AccessibilityInfo.announceForAccessibility(
      `Cancel gift card.${statusAnnouncement}`,
    );
  }, [cancelStatusMessage, sheetMode, visible]);

  const transitionToMode = nextMode => {
    if (nextMode === sheetMode || isTransitioning) return;

    const forward = nextMode === SHEET_MODES.CANCEL;

    if (forward) {
      cancelStep?.onEnter?.();
    } else {
      cancelStep?.onReset?.();
    }

    if (reduceMotionRef.current) {
      setSheetMode(nextMode);
      headerProgress.setValue(forward ? 1 : 0);
      contentOpacity.setValue(1);
      contentTranslateX.setValue(0);
      return;
    }

    setIsTransitioning(true);
    contentOpacity.stopAnimation();
    contentTranslateX.stopAnimation();
    headerProgress.stopAnimation();

    const exitAnimations = [
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: forward ? -TRANSITION_DISTANCE : TRANSITION_DISTANCE,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    if (!forward) {
      exitAnimations.push(
        Animated.timing(headerProgress, {
          toValue: 0,
          duration: EXIT_ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      );
    }

    Animated.parallel(exitAnimations).start(({finished}) => {
      if (!finished) {
        headerProgress.setValue(
          sheetMode === SHEET_MODES.CANCEL ? 1 : 0,
        );
        setIsTransitioning(false);
        return;
      }

      setSheetMode(nextMode);
      contentTranslateX.setValue(
        forward ? TRANSITION_DISTANCE : -TRANSITION_DISTANCE,
      );
      headerProgress.setValue(0);

      const enterAnimations = [
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ];

      if (forward) {
        enterAnimations.push(
          Animated.timing(headerProgress, {
            toValue: 1,
            duration: ENTER_ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        );
      }

      Animated.parallel(enterAnimations).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleRequestClose = () => {
    cancelStep?.onReset?.();
    onClose();
  };

  const handleAction = action => {
    if (action.nextMode === SHEET_MODES.CANCEL) {
      transitionToMode(SHEET_MODES.CANCEL);
      return;
    }

    pendingActionRef.current =
      typeof action.onPress === 'function' ? action.onPress : null;
    handleRequestClose();
  };

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    contentOpacity.stopAnimation();
    contentTranslateX.stopAnimation();
    headerProgress.stopAnimation();
    setSheetMode(SHEET_MODES.OPTIONS);
    setIsTransitioning(false);
    contentOpacity.setValue(1);
    contentTranslateX.setValue(0);
    headerProgress.setValue(0);

    if (typeof pendingAction === 'function') {
      pendingAction();
    }
  };

  const handleCancelPrimary = () => {
    if (cancelStatus === GIFT_CARD_CANCEL_STATUS.ERROR) {
      cancelStep?.onRetry?.();
    } else if (cancelStatus === GIFT_CARD_CANCEL_STATUS.READY) {
      handleAction({onPress: cancelStep?.onContinue});
    }
  };

  const headerAnimatedStyle = {
    height: headerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, HEADER_ROW_HEIGHT],
    }),
    opacity: headerProgress,
  };
  const backButtonAnimatedStyle = {
    opacity: headerProgress,
    transform: [
      {
        translateY: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
    ],
  };
  const contentAnimatedStyle = {
    opacity: contentOpacity,
    transform: [{translateX: contentTranslateX}],
  };
  const cancelPrimaryDisabled =
    isTransitioning ||
    ![
      GIFT_CARD_CANCEL_STATUS.READY,
      GIFT_CARD_CANCEL_STATUS.ERROR,
    ].includes(cancelStatus);
  let cancelStatusColor = theme.colors.textSecondary;

  if (cancelStatus === GIFT_CARD_CANCEL_STATUS.ERROR) {
    cancelStatusColor = theme.colors.danger;
  } else if (cancelStatus === GIFT_CARD_CANCEL_STATUS.PENDING) {
    cancelStatusColor = theme.colors.warning;
  }

  return (
    <BottomSheetModal
      maxHeight="78%"
      onClose={handleRequestClose}
      onClosed={handleClosed}
      visible={visible}>
      <View style={[styles.body, styles.bodyShort]}>
        <Animated.View style={contentAnimatedStyle}>
          <Animated.View
            pointerEvents={
              sheetMode === SHEET_MODES.CANCEL ? 'auto' : 'none'
            }
            style={[localStyles.headerRow, headerAnimatedStyle]}>
            {sheetMode === SHEET_MODES.CANCEL ? (
              <Animated.View style={backButtonAnimatedStyle}>
                <TouchableOpacity
                  accessibilityLabel="Back to gift card options"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  disabled={isTransitioning}
                  onPress={() => transitionToMode(SHEET_MODES.OPTIONS)}
                  style={localStyles.backButton}>
                  <View style={styles.actionIcon}>
                    <ChevronLeft
                      color={theme.colors.textPrimary}
                      size={22}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </Animated.View>

          {sheetMode === SHEET_MODES.OPTIONS ? (
            actions.map(action => (
              <GiftCardOptionRow
                key={action.key}
                danger={action.danger}
                detail={action.detail}
                disabled={action.disabled || isTransitioning}
                IconComponent={action.IconComponent}
                label={action.label}
                onPress={() => handleAction(action)}
                styles={styles}
                theme={theme}
                visuallyDisabled={action.disabled}
              />
            ))
          ) : (
            <View style={localStyles.cancelContent}>
              <Text style={styles.title}>Cancel gift card</Text>
              <Text
                style={[
                  styles.bodyText,
                  localStyles.cancelDescription,
                ]}>
                Redeem this gift card back to your wallet. After redemption,
                the shared link can no longer be spent.
              </Text>
              <Text
                style={[
                  localStyles.cancelSupportingText,
                  {color: theme.colors.textSubtle},
                ]}>
                You’ll review the contents before anything is submitted.
              </Text>
              <View
                accessibilityLiveRegion="polite"
                accessibilityState={{
                  busy:
                    cancelStatus ===
                    GIFT_CARD_CANCEL_STATUS.CHECKING,
                }}
                style={localStyles.cancelStatusArea}>
                {cancelStatusMessage ? (
                  <Text
                    style={[
                      localStyles.cancelStatusText,
                      {color: cancelStatusColor},
                    ]}>
                    {cancelStatusMessage}
                  </Text>
                ) : null}
              </View>
              <AppButton
                accessibilityLabel={
                  cancelPrimaryPresentation.accessibilityLabel
                }
                disabled={cancelPrimaryDisabled}
                height={56}
                mode="contained"
                onPress={handleCancelPrimary}
                themeMode={theme.mode}
                variant="primary">
                {cancelPrimaryPresentation.loading ? (
                  <ActivityIndicator
                    color={theme.colors.onPrimary}
                    size={18}
                  />
                ) : (
                  cancelPrimaryPresentation.label
                )}
              </AppButton>
            </View>
          )}
        </Animated.View>
      </View>
    </BottomSheetModal>
  );
};

// `detail` is a short reason under the label, such as why a disabled action
// is unavailable. It does not dim with the row, so it stays readable.
const GiftCardOptionRow = ({
  danger,
  detail,
  disabled,
  IconComponent,
  label,
  onPress,
  styles,
  theme,
  visuallyDisabled,
}) => {
  const dimmed = visuallyDisabled ? localStyles.disabled : null;
  const labelText = (
    <Text
      style={[
        styles.actionLabel,
        danger && {color: theme.colors.danger},
        detail ? localStyles.detailLabel : null,
      ]}>
      {label}
    </Text>
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{disabled: Boolean(disabled)}}
      activeOpacity={disabled ? 1 : 0.74}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionRow, !detail && dimmed]}>
      <View style={detail ? dimmed : null}>
        <View style={[styles.actionIconContainer, styles.actionIcon]}>
          <IconComponent
            color={danger ? theme.colors.danger : theme.colors.textPrimary}
            size={24}
          />
        </View>
      </View>
      {detail ? (
        <View style={localStyles.detailColumn}>
          <View style={dimmed}>{labelText}</View>
          <Text
            style={[
              theme.typography.caption,
              localStyles.detailText,
              {color: theme.colors.textSecondary},
            ]}>
            {detail}
          </Text>
        </View>
      ) : (
        labelText
      )}
      <View style={detail ? dimmed : null}>
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-right"
          size={22}
        />
      </View>
    </TouchableOpacity>
  );
};

const localStyles = StyleSheet.create({
  headerRow: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: HEADER_ROW_HEIGHT,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelContent: {
    paddingTop: 4,
  },
  cancelDescription: {
    marginTop: 10,
  },
  cancelSupportingText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  cancelStatusArea: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelStatusText: {
    fontSize: 13,
    lineHeight: 19,
  },
  disabled: {
    opacity: 0.45,
  },
  detailColumn: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
  },
  detailLabel: {
    flex: 0,
    paddingRight: 0,
  },
  detailText: {
    marginTop: 2,
  },
});

export default GiftCardOptionsSheet;
