import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

// One paper material in both appearances. Technical identifiers alone use mono.
export const PAYMENT_REQUEST_PAPER = {
  background: '#F6F3EC',
  primary: '#111827',
  secondary: '#4B5565',
  outline: 'rgba(17,24,39,0.09)',
  perforation: 'rgba(17,24,39,0.26)',
  qrBackground: '#FFFFFF',
  qrRing: 'rgba(17,24,39,0.07)',
};

export default StyleSheet.create({
  frame: {
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#07101F',
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.14,
        shadowRadius: 22,
      },
    }),
  },
  outline: {...StyleSheet.absoluteFillObject},
  face: {paddingTop: 18, paddingHorizontal: 22, paddingBottom: 24},
  faceCompact: {paddingTop: 14, paddingBottom: 18},
  faceTight: {paddingTop: 10, paddingBottom: 10},
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 24,
  },
  asset: {flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1},
  assetName: {
    flexShrink: 1,
    color: PAYMENT_REQUEST_PAPER.primary,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
  },
  amountRowCompact: {marginTop: 6},
  amount: {
    minWidth: 0,
    flexShrink: 1,
    color: PAYMENT_REQUEST_PAPER.primary,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.8,
    ...fontStyle('bold'),
  },
  amountCompact: {fontSize: 38, lineHeight: 44},
  unit: {
    maxWidth: '45%',
    color: PAYMENT_REQUEST_PAPER.secondary,
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('semiBold'),
  },
  estimate: {
    marginTop: 4,
    color: PAYMENT_REQUEST_PAPER.secondary,
    fontSize: 15,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  note: {
    marginTop: 6,
    color: PAYMENT_REQUEST_PAPER.primary,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('medium'),
  },
  stub: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  stubCompact: {paddingTop: 8, paddingBottom: 10},
  qrTile: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: PAYMENT_REQUEST_PAPER.qrBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PAYMENT_REQUEST_PAPER.qrRing,
  },
  address: {
    width: '100%',
    textAlign: 'center',
    marginTop: 12,
    color: PAYMENT_REQUEST_PAPER.secondary,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  addressCompact: {marginTop: 6},
  identifier: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
});
