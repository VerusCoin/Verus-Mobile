import React, {useMemo} from 'react';
import {Animated, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {createSignedOutSheetStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const SignedOutActionRow = ({
  animatedValue,
  disabled = false,
  label,
  IconComponent,
  iconSize = 24,
  style,
  labelStyle,
  testID,
  onPress,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const animatedStyle = animatedValue
    ? {
        opacity: animatedValue,
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }
    : null;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={disabled ? 1 : 0.74}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        style={[styles.actionRow, style]}>
        {IconComponent ? (
          <View style={[styles.actionIconContainer, styles.actionIcon]}>
            <IconComponent size={iconSize} color={theme.colors.textPrimary} />
          </View>
        ) : null}
        <Text style={[styles.actionLabel, labelStyle]}>{label}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SignedOutActionRow;
