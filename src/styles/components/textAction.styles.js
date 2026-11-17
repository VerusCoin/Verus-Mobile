import {StyleSheet} from 'react-native';

const createTextActionStyles = theme => StyleSheet.create({
  target: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center'},
  chipTarget: {minWidth: 48, minHeight: 48, alignItems: 'center'},
  content: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm},
  label: {flexShrink: 1},
  chip: {borderWidth: 1, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10},
  pressed: {opacity: 0.72},
});

export default createTextActionStyles;
