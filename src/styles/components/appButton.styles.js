import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export const APP_BUTTON_HEIGHT = 56;
export const APP_BUTTON_SMALL_HEIGHT = 44;
export const APP_BUTTON_RADIUS = 18;
export const APP_BUTTON_LABEL_SIZE = 17;

export default StyleSheet.create({
  button: {
    borderRadius: APP_BUTTON_RADIUS,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  content: {
    justifyContent: 'center',
  },
  label: {
    ...fontStyle('semiBold'),
    fontSize: APP_BUTTON_LABEL_SIZE,
    letterSpacing: -0.2,
  },
});
