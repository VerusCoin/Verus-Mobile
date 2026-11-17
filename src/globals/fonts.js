import {Platform} from 'react-native';

const INTER_IOS_FAMILY = 'Inter 18pt';

const fontFiles = {
  thin: 'Inter18pt-Thin',
  extraLight: 'Inter18pt-ExtraLight',
  light: 'Inter18pt-Light',
  regular: 'Inter18pt-Regular',
  italic: 'Inter18pt-Italic',
  medium: 'Inter18pt-Medium',
  semiBold: 'Inter18pt-SemiBold',
  bold: 'Inter18pt-Bold',
  black: 'Inter18pt-Black',
};

const fontWeights = {
  thin: '100',
  extraLight: '200',
  light: '300',
  regular: '400',
  italic: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  black: '900',
};

const Fonts = {
  family: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.regular,
  thin: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.thin,
  extraLight: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.extraLight,
  light: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.light,
  regular: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.regular,
  italic: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.italic,
  medium: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.medium,
  semiBold: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.semiBold,
  bold: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.bold,
  black: Platform.OS === 'ios' ? INTER_IOS_FAMILY : fontFiles.black,
};

export const fontRoleForWeight = fontWeight => {
  switch (`${fontWeight}`) {
    case '100':
      return 'thin';
    case '200':
      return 'extraLight';
    case '300':
      return 'light';
    case '500':
      return 'medium';
    case '600':
      return 'semiBold';
    case 'bold':
    case '700':
      return 'bold';
    case '800':
      return 'semiBold';
    case '900':
      return 'black';
    default:
      return 'regular';
  }
};

export const fontStyle = role => {
  const fontRole = role || 'regular';

  return Platform.OS === 'ios'
    ? {
        fontFamily: INTER_IOS_FAMILY,
        fontWeight: fontWeights[fontRole],
      }
    : {
        fontFamily: fontFiles[fontRole],
        fontWeight: 'normal',
      };
};

export const fontStyleForWeight = fontWeight =>
  fontStyle(fontRoleForWeight(fontWeight));

export default Fonts;
