import React from 'react';
import {Platform} from 'react-native';
import {Switch} from 'react-native-paper';
import {useOnboardingTheme} from '../theme/onboarding';

// Android otherwise takes its thumb from the system Material palette.
// iOS keeps its native appearance and the caller's existing colors.
const AppSwitch = ({color, ...props}) => {
  const theme = useOnboardingTheme();
  const androidColors = Platform.OS === 'android'
    ? {
        thumbColor: props.disabled ? theme.colors.textSubtle : theme.colors.onPrimary,
        trackColor: {
          false: props.disabled ? theme.colors.border : theme.colors.borderStrong,
          true: props.disabled ? theme.colors.borderStrong : color || theme.colors.primary,
        },
      }
    : {};

  return <Switch color={color} {...props} {...androidColors} />;
};

export default AppSwitch;
