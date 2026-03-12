/*
  GradientButton
  - Reusable gradient button component with optional hold-to-confirm functionality
  - Updated 2026-01-22: Added hold-to-confirm feature for critical actions.
    When holdToConfirm={true}, user must press and hold for specified duration (default 2.5s).
    Shows animated progress fill and haptic feedback. Prevents accidental taps on critical actions.
*/
import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, View, Animated, Vibration, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { gradientButtonStyles as styles } from '../styles';

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
}) => {
  const isOutlined = mode === 'outlined';
  const [isHolding, setIsHolding] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef(null);
  const hasCompletedHold = useRef(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    };
  }, []);

  // Reset hold state when disabled changes
  useEffect(() => {
    if (disabled) {
      handlePressOut();
    }
  }, [disabled]);

  const handlePressIn = () => {
    if (disabled || !holdToConfirm) return;

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
      hasCompletedHold.current = true;
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
      
      // Reset state
      setIsHolding(false);
      holdProgress.setValue(0);
    }, holdDuration);
  };

  const handlePressOut = () => {
    if (!holdToConfirm || hasCompletedHold.current) return;

    // User released before completion
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    // Stop and reset animation
    holdProgress.stopAnimation(() => {
      holdProgress.setValue(0);
    });

    setIsHolding(false);
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
      onPress={handlePress}
      onPressIn={holdToConfirm ? handlePressIn : undefined}
      onPressOut={holdToConfirm ? handlePressOut : undefined}
      disabled={disabled}
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

export default GradientButton;
