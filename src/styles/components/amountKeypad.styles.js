import {StyleSheet} from 'react-native';

export const createAmountKeypadStyles = theme => StyleSheet.create({
  grid: {gap: 8},
  gridCompact: {gap: 4},
  gridCompactIos: {gap: 0},
  row: {flexDirection: 'row', gap: 8},
  rowCompact: {gap: 4},
  touch: {
    flex: 1,
    minWidth: 48,
    height: 48,
    justifyContent: 'center',
  },
  key: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  keyCompact: {height: 44},
  plain: {backgroundColor: 'transparent'},
  pressed: {backgroundColor: theme.colors.border},
  hidden: {opacity: 0},
  label: {...theme.typography.amountKey, color: theme.colors.textPrimary},
  labelCompact: {...theme.typography.amountKeyCompact},
});
