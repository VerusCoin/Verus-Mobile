import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Check} from 'lucide-react-native';
import {useAppTheme} from '../theme/app';

// Completion mark for an outcome that confirms nothing was delivered. A green
// check (AnimatedSuccessCheckmark) means "confirmed". This one means "done".
const NeutralCheckMark = ({size = 72, style}) => {
  const theme = useAppTheme();

  return (
    <View
      accessible={false}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceMuted,
        },
        style,
      ]}>
      <Check
        color={theme.colors.textSecondary}
        size={Math.round(size / 2)}
        strokeWidth={2.4}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NeutralCheckMark;
