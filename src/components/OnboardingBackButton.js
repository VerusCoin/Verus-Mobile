import React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../theme/app';

const OnboardingBackButton = ({disabled = false, onPress, style}) => {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      accessibilityLabel="Go back"
      accessibilityRole="button"
      accessibilityState={{disabled}}
      activeOpacity={0.74}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, style]}>
      <MaterialCommunityIcons
        color={theme.colors.textPrimary}
        name="arrow-left"
        size={24}
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

export default OnboardingBackButton;
