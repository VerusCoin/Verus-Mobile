/*
  ReviewStep.styles 
  - Connector and spacer styles used by the identity update review step.
*/
import { StyleSheet } from 'react-native';

// Codex GPT-5: keep the review-step connector styling out of the render component.
export default StyleSheet.create({
  connectorContainer: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
    position: 'absolute',
  },
  connectorArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
  },
  bottomSpacer: {
    height: 24,
  },
});
