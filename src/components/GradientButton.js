/*
  GradientButton 
  - Reusable gradient button component with optional hold-to-confirm functionality.
  - Updated 2026-01-22: Added hold-to-confirm support for critical actions while
    keeping the default gradient button API unchanged for ordinary taps.
*/
import React, { useRef, useEffect, useState } from 'react';
import { AccessibilityInfo, TouchableOpacity, View, Animated, Vibration, Platform, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { gradientButtonStyles as styles } from '../styles';
import {getButtonHitSlop, useButtonHeight} from '../hooks/useButtonHeight';

const GradientButton = ({
  onPress,
  children,
  disabled = false,
  style,
  contentStyle,
  labelStyle,
  topColor = '#3165D4',
  bottomColor = '#3165D4',
  mode = 'contained',
  leftIcon,
  rightIcon,
  iconGap = 8,
  holdToConfirm = false,
  holdDuration = 2500,
  holdingText,
  holdHint,
  hitSlop,
}) => {
  const buttonHeight = useButtonHeight('primary', StyleSheet.flatten(style)?.height);
  const isOutlined = mode === 'outlined';
  const [isHolding, setIsHolding] = useState(false);
  const [showHoldHint, setShowHoldHint] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef(null);
  const hintTimer = useRef(null);
  const hasCompletedHold = useRef(false);
  const hint = holdHint || (
    typeof children === 'string' && /\bconvert\b/i.test(children)
      ? 'Hold the button to convert.'
      : typeof children === 'string' && /\bsend\b/i.test(children)
        ? 'Hold the button to send.' : 'Hold the button to confirm.'
  );

  const clearHint = () => {
    clearTimeout(hintTimer.current);
    hintTimer.current = null;
    setShowHoldHint(false);
  };

  const cancelHold = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
    setIsHolding(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(holdTimer.current);
      clearTimeout(hintTimer.current);
      holdProgress.stopAnimation();
    };
  }, []);

  // Reset hold state when disabled changes
  useEffect(() => {
    if (disabled || !holdToConfirm) {
      cancelHold();
      clearHint();
    }
  }, [disabled, holdToConfirm]);

  const handlePressIn = () => {
    if (disabled || !holdToConfirm || holdTimer.current != null) return;

    clearHint();
    setIsHolding(true);
    hasCompletedHold.current = false;

    // Light haptic feedback on press start (iOS)
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }

    // Animate progress fill
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: holdDuration,
      useNativeDriver: false,
    }).start();

    // Set timer for hold completion
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      hasCompletedHold.current = true;
      setIsHolding(false);
      holdProgress.setValue(0);
      // Success haptic feedback (iOS medium impact)
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 50]);
      } else {
        Vibration.vibrate(50);
      }
      
      // Execute the action
      if (onPress) {
        onPress();
      }

    }, holdDuration);
  };

  const handlePressOut = () => {
    if (!holdToConfirm || hasCompletedHold.current || holdTimer.current == null) return;

    cancelHold();
    if (disabled) return;
    // Use the existing label slot so feedback never moves the safe footer or
    // covers a notice. The action label returns after three seconds.
    setShowHoldHint(true);
    AccessibilityInfo.announceForAccessibility(hint);
    hintTimer.current = setTimeout(() => {
      hintTimer.current = null;
      setShowHoldHint(false);
    }, 3000);
  };

  const handlePress = () => {
    // For non-hold-to-confirm buttons, execute immediately
    if (!holdToConfirm && onPress) {
      onPress();
    }
  };
  
  const renderContent = () => {
    // Determine text to display
    let displayText = children;
    if (typeof children === 'string' && holdToConfirm && isHolding) {
      displayText = holdingText || 'Hold to confirm...';
    } else if (holdToConfirm && showHoldHint) {
      displayText = hint;
    }

    if (typeof displayText !== 'string') {
      return displayText;
    }

    const textComponent = (
      <Text 
        style={[
          styles.gradientButtonLabel, 
          isOutlined && { 
            color: bottomColor,
            textShadowColor: 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 0
          },
          labelStyle
        ]}
      >
        {displayText}
      </Text>
    );

    if (leftIcon || rightIcon) {
      return (
        <View style={[styles.rowContent, { gap: iconGap }]}>
          {leftIcon}
          {textComponent}
          {rightIcon}
        </View>
      );
    }

    return textComponent;
  };
  
  // Interpolate progress to width percentage
  const progressWidth = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{disabled: Boolean(disabled)}}
      onPress={handlePress}
      onPressIn={holdToConfirm ? handlePressIn : undefined}
      onPressOut={holdToConfirm ? handlePressOut : undefined}
      disabled={disabled}
      hitSlop={getButtonHitSlop(buttonHeight, hitSlop)}
      activeOpacity={holdToConfirm ? 1 : 0.8}
      style={[
        styles.gradientButtonWrapper,
        disabled && { opacity: 0.5 },
        isOutlined ? {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: bottomColor,
        } : {
          borderWidth: 1,
          borderColor: bottomColor,
        },
        style,
        {height: buttonHeight},
      ]}
    >
      {!isOutlined && (
        <Svg
          width="100%"
          height="100%"
          style={styles.gradientBackground}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="gradientButton" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={topColor} />
              <Stop offset="1" stopColor={bottomColor} />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#gradientButton)"
          />
        </Svg>
      )}

      {/* Hold-to-confirm progress overlay */}
      {holdToConfirm && isHolding && (
        <Animated.View
          style={[
            styles.holdProgressOverlay,
            {
              width: progressWidth,
            },
          ]}
        />
      )}

      <View style={[styles.gradientButtonContent, contentStyle]}>
        {renderContent()}
      </View>
    </TouchableOpacity>
  );
};

// Keep this reusable button self-contained; integrated by Codex GPT-5 while preserving the existing call sites.
export default GradientButton;
