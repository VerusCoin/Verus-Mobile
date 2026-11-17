import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export default StyleSheet.create({
  to: {paddingLeft: 6, fontSize: 16, lineHeight: 22, ...fontStyle('regular')},
  withToInput: {paddingLeft: 10, paddingRight: 4},
  technical: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  idleValue: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingLeft: 16,
    paddingRight: 4,
  },
  idleValueWithTo: {paddingLeft: 10},
  value: {fontSize: 16, lineHeight: 22, ...fontStyle('regular')},
  prefix: {flexShrink: 1},
  suffix: {flexShrink: 0},
  actions: {flexDirection: 'row', paddingRight: 2, alignItems: 'center'},
  scan: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  action: {width: 64, height: 44, justifyContent: 'center'},
  pill: {
    height: 32,
    marginHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
});
