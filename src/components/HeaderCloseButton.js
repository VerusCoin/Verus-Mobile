import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../theme/app';

// The stack header's close control: the Send wizard's close icon in the
// 44-point target of OnboardingBackButton, so it mirrors the back arrow.
const HeaderCloseButton = ({
  accessibilityLabel = 'Close',
  disabled = false,
  onPress,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{disabled}}
      activeOpacity={0.74}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, style]}>
      <MaterialCommunityIcons
        color={theme.colors.textPrimary}
        name="close"
        size={22}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.36,
  },
});

export default HeaderCloseButton;
