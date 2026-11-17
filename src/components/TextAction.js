import React, {useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {createTextActionStyles} from '../styles';
import {resolveAppTheme, useAppTheme} from '../theme/app';

// Content actions share type, color and feedback. Footer actions use AppButton.
const TextAction = ({
  children,
  disabled = false,
  destructive = false,
  Icon,
  size = 'default',
  variant,
  style,
  textStyle,
  themeMode,
  hitSlop,
  onLayout,
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}) => {
  const appTheme = useAppTheme();
  const theme = themeMode ? resolveAppTheme(themeMode) : appTheme;
  const styles = useMemo(() => createTextActionStyles(theme), [theme]);
  const chip = variant === 'chip';
  const target = chip ? 48 : 44;
  const [layout, setLayout] = useState({width: target, height: target});
  const horizontal = Math.max(0, (target - layout.width) / 2);
  const vertical = Math.max(0, target - layout.height);
  const edges = typeof hitSlop === 'number'
    ? {top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop}
    : hitSlop || {};
  // A compact context slot can extend upward instead of into content below it.
  const verticalCovered = (edges.top || 0) + (edges.bottom || 0) >= vertical;
  const color = disabled ? theme.colors.disabledText : destructive ? theme.colors.dangerText : theme.colors.link;

  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      accessibilityState={{...accessibilityState, disabled}}
      disabled={disabled}
      hitSlop={{
        left: Math.max(horizontal, edges.left || 0),
        right: Math.max(horizontal, edges.right || 0),
        top: verticalCovered ? edges.top || 0 : vertical / 2,
        bottom: verticalCovered ? edges.bottom || 0 : vertical / 2,
      }}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        setLayout(previous => previous.width === width && previous.height === height
          ? previous : {width, height});
        onLayout?.(event);
      }}
      style={({pressed}) => [
        styles.target,
        chip && styles.chipTarget,
        style,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={[styles.content, chip && styles.chip, chip && {borderColor: color}]}>
        {Icon ? <Icon size={20} strokeWidth={2} color={color} /> : null}
        <Text style={[
          chip ? theme.typography.labelDense
            : size === 'small' ? theme.typography.caption : theme.typography.labelMd,
          styles.label,
          textStyle,
          {color},
        ]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
};

export default TextAction;
