import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default styles;