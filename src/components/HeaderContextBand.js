import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useOnboardingTheme} from '../theme/onboarding';

// A slim full-bleed line under a stepped-task header. It reminds the user
// what the task acts on, without a second title. Screen readers read it as
// one item.
const HeaderContextBand = ({accessibilityLabel, children, inset}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={[
        styles.band,
        {
          backgroundColor: theme.colors.surfaceMuted,
          paddingLeft: insets.left + inset,
          paddingRight: insets.right + inset,
        },
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default HeaderContextBand;
