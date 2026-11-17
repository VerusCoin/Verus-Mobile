import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export default StyleSheet.create({
  badge: {
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    ...fontStyle('semiBold'),
  },
});
