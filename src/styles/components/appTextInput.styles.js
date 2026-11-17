import {Platform, StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

const androidFontPaddingFix =
  Platform.OS === 'android' ? {includeFontPadding: false} : {};

export default StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    color: Colors.quaternaryColor,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  inputShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    backgroundColor: '#F3F5F8',
  },
  singleLineInputShell: {
    height: 48,
  },
  compactInputShell: {
    minHeight: 48,
    height: 48,
  },
  multilineInputShell: {
    alignItems: 'center',
  },
  inputShellError: {
    borderColor: Colors.warningButtonColor,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 16,
    color: Colors.quinaryColor,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  singleLineInput: {
    height: 44,
    paddingVertical: 0,
    textAlignVertical: 'center',
    ...androidFontPaddingFix,
  },
  iosSingleLineInput: {
    // Let UITextField center the font's native line instead of a taller paragraph.
    lineHeight: undefined,
  },
  compactInput: {
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'center',
    ...androidFontPaddingFix,
  },
  multilineInput: {
    minHeight: 46,
    paddingVertical: 12,
    lineHeight: 22,
    textAlignVertical: 'top',
    ...androidFontPaddingFix,
  },
  leftAccessory: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  compactLeftAccessory: {
    width: 44,
    height: 44,
    paddingLeft: 0,
  },
  rightAccessory: {
    paddingRight: 16,
  },
  rightAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRightAction: {
    width: 44,
    height: 44,
  },
  inputSlot: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenInput: {opacity: 0},
  idleContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  supportingText: {
    marginTop: 7,
    color: Colors.verusDarkGray,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  errorText: {
    color: Colors.warningButtonColor,
  },
});
