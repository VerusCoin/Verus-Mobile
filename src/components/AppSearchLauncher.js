import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {appSearchStyles as styles} from '../styles';
import {
  resolveOnboardingTheme,
  useOnboardingTheme,
} from '../theme/onboarding';

const AppSearchLauncher = ({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  style,
  testID,
  themeMode,
}) => {
  const onboardingTheme = useOnboardingTheme();
  const theme = themeMode
    ? resolveOnboardingTheme(themeMode)
    : onboardingTheme;
  const iconColor = disabled
    ? theme.colors.disabledText
    : theme.colors.inputPlaceholder;

  return (
    <View style={[styles.launcherContainer, style]}>
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityState={{disabled}}
        activeOpacity={0.72}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.launcher,
          {
            backgroundColor: disabled
              ? theme.colors.disabledButton
              : theme.colors.input,
            borderColor: theme.colors.inputBorder,
          },
        ]}
        testID={testID}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.launcherIconLane}>
          <MaterialCommunityIcons color={iconColor} name="magnify" size={20} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.launcherLabel,
            {
              color: disabled
                ? theme.colors.disabledText
                : theme.colors.inputPlaceholder,
            },
          ]}>
          {label}
        </Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.launcherIconLane}>
          <MaterialCommunityIcons
            color={iconColor}
            name="chevron-right"
            size={22}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default AppSearchLauncher;
