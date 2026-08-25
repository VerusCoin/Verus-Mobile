/*
  GenericRequestComplete.styles 
  - Layout styles for the generic request completion screen.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// keep the completion screen presentation centralized and separate from response handling.
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  checkmarkContainer: {
    paddingVertical: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  txidCard: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  txidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txidLabel: {
    fontSize: 14,
    color: '#888',
  },
  txidValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  txidValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    maxWidth: 170,
    textAlign: 'right',
  },
  copiedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryColor,
    marginLeft: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  footer: {
    backgroundColor: 'white',
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ctaCol: {
    flex: 1,
    minWidth: 0,
  },
  secondaryCta: {
    width: '100%',
    height: 52,
    borderRadius: 24,
    backgroundColor: '#EBF6FF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  secondaryCtaContent: {
    height: 52,
  },
  secondaryCtaLabel: {
    color: Colors.primaryColor,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'none',
  },
  completeButton: {
    width: '100%',
  },
});
