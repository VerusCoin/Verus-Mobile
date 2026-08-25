/*
  GradientButton.styles 
  - Shared styles for the gradient button component.
*/
import { StyleSheet } from 'react-native';

// keep the gradient button layout centralized without altering button behavior.
export default StyleSheet.create({
  gradientButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    height: 52,
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
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0,
  },
});
