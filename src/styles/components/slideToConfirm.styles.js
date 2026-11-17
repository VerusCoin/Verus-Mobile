import {StyleSheet} from 'react-native';
import {APP_BUTTON_RADIUS} from './appButton.styles';

export default StyleSheet.create({
  track: {
    borderRadius: APP_BUTTON_RADIUS,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {alignItems: 'center'},
  thumb: {
    position: 'absolute',
    left: 3,
    top: 3,
    borderRadius: APP_BUTTON_RADIUS - 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
