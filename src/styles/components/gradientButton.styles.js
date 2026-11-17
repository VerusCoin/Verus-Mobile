/*
  GradientButton.styles 
  - Shared styles for the gradient button component.
*/
import { StyleSheet } from 'react-native';
import {fontStyle} from '../../globals/fonts';
import {
  APP_BUTTON_LABEL_SIZE,
  APP_BUTTON_RADIUS,
} from './appButton.styles';

// keep the gradient button layout centralized without altering button behavior.
export default StyleSheet.create({
  gradientButtonWrapper: {
    borderRadius: APP_BUTTON_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  holdProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 1,
  },
  gradientButtonContent: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonLabel: {
    ...fontStyle('semiBold'),
    fontSize: APP_BUTTON_LABEL_SIZE,
    color: 'white',
    letterSpacing: 0,
  },
});
