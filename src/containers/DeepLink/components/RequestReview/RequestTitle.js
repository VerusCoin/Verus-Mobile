import React from 'react';
import {Text} from 'react-native';
import {useOnboardingSmallDeviceLayout} from '../../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../../theme/onboarding';

// Screen title for GenericRequest review, result, and password screens.
// Small devices use the compact headline role so a title keeps to one line.
const RequestTitle = ({children, style, ...textProps}) => {
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();

  return (
    <Text
      accessibilityRole="header"
      {...textProps}
      style={[
        smallDevice
          ? theme.typography.headlineCompact
          : theme.typography.headlineLg,
        {color: theme.colors.textPrimary},
        style,
      ]}>
      {children}
    </Text>
  );
};

export default RequestTitle;
