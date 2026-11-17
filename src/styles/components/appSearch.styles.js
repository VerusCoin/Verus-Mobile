import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const androidFontPaddingFix =
  Platform.OS === 'android' ? {includeFontPadding: false} : {};

export default StyleSheet.create({
  fieldContainer: {
    alignSelf: 'stretch',
  },
  launcherContainer: {
    width: '100%',
  },
  launcher: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  launcherIconLane: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherLabel: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
    ...androidFontPaddingFix,
  },
});
