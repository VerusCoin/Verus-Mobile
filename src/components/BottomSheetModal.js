import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import {Portal} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Colors from '../globals/colors';
import {useTrackBottomSheetActivity} from '../hooks/useBottomSheetActivity';
import SemiModal from './SemiModal';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../theme/onboarding';

const OPEN_ANIMATION_DURATION = 230;
const CLOSE_ANIMATION_DURATION = 160;

const BottomSheetModal = ({
  visible,
  onClose,
  onClosed,
  children,
  embedded = false,
  floating = true,
  maxHeight = '80%',
  contentContainerStyle,
  avoidKeyboard,
  keyboardVerticalOffset,
  ...modalProps
}) => {
  const insets = useSafeAreaInsets();
  // The app alert is a Paper dialog under the root. A native modal covers it,
  // so step the sheet aside while an alert is open. The sheet keeps its state.
  const alertActive = useSelector(state => state.alert?.active != null);
  const {height: windowHeight} = useWindowDimensions();
  const theme = useOnboardingTheme();
  const animation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const renderVisibleRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  const reduceMotionRef = useRef(false);
  const [renderVisible, setRenderVisible] = useState(visible);
  useTrackBottomSheetActivity(renderVisible);
  const bottomSpacing = floating ? Math.max(insets.bottom, 12) : 0;
  // A percentage max height resolves against the modal root. On a short
  // Android window the root grows with a tall sheet, so the sheet's bottom,
  // and its action button, fall below the screen. Resolve the percentage
  // against the visible window instead.
  const resolvedMaxHeight =
    Platform.OS === 'android' &&
    typeof maxHeight === 'string' &&
    maxHeight.endsWith('%')
      ? Math.floor(
          ((windowHeight - (StatusBar.currentHeight || 0)) *
            parseFloat(maxHeight)) /
            100,
        )
      : maxHeight;
  const safeAreaPadding = floating ? 0 : insets.bottom;

  const setInternalVisible = useCallback(nextVisible => {
    renderVisibleRef.current = nextVisible;
    setRenderVisible(nextVisible);
  }, []);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

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
        if (active) {
          reduceMotionRef.current = false;
        }
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    animation.stopAnimation();
    const reduceMotionEnabled = reduceMotionRef.current;

    if (visible) {
      setInternalVisible(true);
      animation.setValue(reduceMotionEnabled ? 1 : 0);

      if (!reduceMotionEnabled) {
        Animated.timing(animation, {
          toValue: 1,
          duration: OPEN_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    } else if (renderVisibleRef.current) {
      const completeClose = () => {
        setInternalVisible(false);

        if (typeof onClosedRef.current === 'function') {
          onClosedRef.current();
        }
      };

      if (reduceMotionEnabled) {
        animation.setValue(0);
        completeClose();
      } else {
        Animated.timing(animation, {
          toValue: 0,
          duration: CLOSE_ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({finished}) => {
          if (active && finished) {
            completeClose();
          }
        });
      }
    }

    return () => {
      active = false;
      animation.stopAnimation();
    };
  }, [animation, setInternalVisible, visible]);

  // An alert hides a native sheet at once (see the render below). A sheet
  // that was closing then never finishes its animation, and it would come
  // back when the alert closes. Finish the close now instead. Embedded sheets,
  // such as the app alert itself, do not step aside.
  useEffect(() => {
    if (embedded || !alertActive || visible || !renderVisibleRef.current) {
      return;
    }

    animation.stopAnimation();
    animation.setValue(0);
    setInternalVisible(false);

    if (typeof onClosedRef.current === 'function') {
      onClosedRef.current();
    }
  }, [alertActive, animation, embedded, setInternalVisible, visible]);

  const sheetStyle = StyleSheet.flatten([
    styles.sheet,
    floating ? styles.floatingSheet : styles.attachedSheet,
    {
      marginBottom: bottomSpacing,
      paddingBottom: safeAreaPadding,
      maxHeight: resolvedMaxHeight,
      backgroundColor: theme.colors.sheet,
      borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
    },
    contentContainerStyle,
  ]);
  const overlayAnimatedStyle = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, theme.colors.scrimOpacity],
    }),
  };
  const sheetAnimatedStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [44, 0],
        }),
      },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  if (embedded) {
    if (!renderVisible) return null;

    const EmbeddedWrapper = avoidKeyboard ? KeyboardAvoidingView : View;
    const embeddedWrapperProps = avoidKeyboard
      ? {
          behavior: Platform.OS === 'ios' ? 'padding' : 'height',
          keyboardVerticalOffset: keyboardVerticalOffset || 0,
        }
      : {};

    return (
      <EmbeddedWrapper
        {...embeddedWrapperProps}
        accessibilityViewIsModal
        importantForAccessibility="yes"
        pointerEvents="box-none"
        style={styles.embeddedRoot}>
        <TouchableWithoutFeedback accessible={false} onPress={onClose}>
          <Animated.View
            style={[
              styles.embeddedOverlay,
              {backgroundColor: theme.colors.scrim},
              overlayAnimatedStyle,
            ]}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          accessibilityViewIsModal
          style={[sheetStyle, styles.embeddedSheet, sheetAnimatedStyle]}>
          <OnboardingThemeProvider modeOverride={theme.mode}>
            {children}
          </OnboardingThemeProvider>
        </Animated.View>
      </EmbeddedWrapper>
    );
  }

  return (
    <Portal>
      {renderVisible && !alertActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            {backgroundColor: theme.colors.scrim},
            overlayAnimatedStyle,
          ]}
        />
      )}
      <SemiModal
        {...modalProps}
        animationType="none"
        avoidKeyboard={avoidKeyboard}
        contentContainerStyle={sheetStyle}
        flexHeight={0.01}
        modalTheme={theme}
        keyboardVerticalOffset={keyboardVerticalOffset}
        onDismiss={undefined}
        onRequestClose={onClose}
        sheetAnimatedStyle={sheetAnimatedStyle}
        showHeader={false}
        showOverlay={false}
        transparent
        visible={renderVisible && !alertActive}>
        <OnboardingThemeProvider modeOverride={theme.mode}>
          {children}
        </OnboardingThemeProvider>
      </SemiModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.quinaryColor,
    elevation: 15,
    zIndex: 15,
  },
  sheet: {
    flex: 0,
    alignSelf: 'stretch',
    backgroundColor: Colors.secondaryColor,
  },
  floatingSheet: {
    marginHorizontal: 12,
    borderRadius: 24,
    shadowColor: Colors.quinaryColor,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: -8},
    elevation: 16,
  },
  attachedSheet: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  embeddedRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  embeddedOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  embeddedSheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
});

export default BottomSheetModal;
