import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Button} from 'react-native-paper';
import Colors from '../globals/colors';
import {appButtonStyles as styles} from '../styles';
import {
  resolveAppTheme,
  useAppTheme,
} from '../theme/app';
import {APP_BUTTON_HEIGHT, APP_BUTTON_RADIUS} from '../styles/components/appButton.styles';
import {getButtonHitSlop, useButtonHeight} from '../hooks/useButtonHeight';

const TONAL_ON_DARK_COLOR = 'rgba(255, 255, 255, 0.16)';
const DISABLED_BUTTON_COLOR = '#E4E8EF';
const DISABLED_TEXT_COLOR = '#9AA3AF';

const createVariantStyles = theme => ({
  primary: {
    buttonColor: theme.colors.primary,
    textColor: theme.colors.onPrimary,
  },
  destructive: {
    buttonColor: theme.colors.destructive,
    textColor: theme.colors.onDestructive,
  },
  secondary: {
    buttonColor: theme.isDark ? theme.colors.surfaceMuted : '#EEF2F8',
    textColor: theme.isDark ? theme.colors.textPrimary : theme.colors.primary,
  },
  tonal: {
    buttonColor: theme.isDark
      ? theme.colors.surfaceMuted
      : TONAL_ON_DARK_COLOR,
    textColor: theme.isDark ? theme.colors.textPrimary : Colors.secondaryColor,
  },
  text: {
    buttonColor: 'transparent',
    textColor: theme.colors.link,
  },
});

const createDisabledVariantStyles = theme => ({
  primary: {
    buttonColor: theme.colors.disabledButton || DISABLED_BUTTON_COLOR,
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
  secondary: {
    buttonColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F3F6',
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
  tonal: {
    buttonColor: theme.isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.08)',
    textColor: theme.colors.disabledText || 'rgba(255, 255, 255, 0.42)',
  },
  text: {
    buttonColor: 'transparent',
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
});

const AppButton = ({
  children,
  variant = 'primary',
  height = APP_BUTTON_HEIGHT,
  // Compact Home notices keep their visible height, with a 48-point target.
  preserveHeightOnSmallWindow = false,
  hitSlop,
  mode = 'text',
  uppercase = false,
  disabled = false,
  buttonColor,
  textColor,
  themeMode,
  contentStyle,
  labelStyle,
  style,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const appTheme = useAppTheme();
  const buttonHeight = useButtonHeight(variant, height, preserveHeightOnSmallWindow);
  const theme = themeMode
    ? resolveAppTheme(themeMode)
    : appTheme;
  const variantStyles = createVariantStyles(theme);
  const disabledVariantStyles = createDisabledVariantStyles(theme);
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const disabledVariantStyle =
    disabledVariantStyles[variant] || disabledVariantStyles.primary;
  const resolvedButtonColor = disabled
    ? disabledVariantStyle.buttonColor
    : buttonColor || (variant === 'destructive' && pressed
      ? theme.colors.destructivePressed
      : variantStyle.buttonColor);
  const resolvedTextColor = disabled
    ? disabledVariantStyle.textColor
    : textColor || variantStyle.textColor;

  const handlePressIn = variant === 'destructive' ? event => {
    setPressed(true);
    onPressIn?.(event);
  } : onPressIn;
  const handlePressOut = variant === 'destructive' ? event => {
    setPressed(false);
    onPressOut?.(event);
  } : onPressOut;

  const button = (
    <Button
      {...props}
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      mode={mode}
      uppercase={uppercase}
      buttonColor={resolvedButtonColor}
      textColor={resolvedTextColor}
      contentStyle={[
        styles.content,
        {
          height: buttonHeight,
        },
        contentStyle,
      ]}
      labelStyle={[
        styles.label,
        labelStyle,
        {
          color: resolvedTextColor,
        },
      ]}
      style={[
        styles.button,
        {
          backgroundColor: resolvedButtonColor,
        },
        preserveHeightOnSmallWindow
          ? {borderRadius: StyleSheet.flatten(style)?.borderRadius ?? APP_BUTTON_RADIUS}
          : style,
      ]}>
      {children}
    </Button>
  );

  if (!preserveHeightOnSmallWindow) return button;

  // Paper Button forwards hitSlop to its Surface, not its touchable. Give
  // these small pills a real expanded target without changing their layout.
  return (
    <TouchableOpacity
      accessibilityLabel={props.accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityHint={props.accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{disabled}}
      activeOpacity={0.72}
      disabled={disabled}
      hitSlop={getButtonHitSlop(buttonHeight, hitSlop)}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {button}
      </View>
    </TouchableOpacity>
  );
};

export default AppButton;
