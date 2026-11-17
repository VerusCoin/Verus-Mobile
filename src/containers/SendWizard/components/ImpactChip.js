import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import StatusBadge from '../../../components/StatusBadge';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getImpactTone} from './impactFormat';

// The price impact badge as a doorway to "Price and route": the tinted badge
// and a small chevron. Send's Amount step and an invoice's Pay with share it.
const ImpactChip = ({accessibilityLabel, hitSlop = 4, label, level, onPress, style}) => {
  const theme = useOnboardingTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={({pressed}) => [styles.chip, style, pressed && styles.pressed]}>
      <StatusBadge label={label} tone={getImpactTone(level)} />
      <MaterialCommunityIcons
        name="chevron-right"
        size={14}
        color={theme.colors.textSubtle}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {minHeight: 36, flexDirection: 'row', alignItems: 'center', flexShrink: 0},
  pressed: {opacity: 0.7},
});

export default ImpactChip;
