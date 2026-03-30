/*
  ConfirmPayStep.styles 
  - Payment-source, fee, and source-sheet styles for the final request step.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// extracted payment-step styling to keep fee and signing logic focused.
export default StyleSheet.create({
  sourceSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  sourceSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceSelectLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sourceSelectValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  feeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  feeFiat: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  feePlaceholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  feeCalculating: {
    fontSize: 14,
    color: Colors.primaryColor,
  },
  recapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  recapTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recapText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  sheetDescription: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetDescriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sheetListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  sheetEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  walletAddressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletAddressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  walletBalanceSection: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  walletBalanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  walletBalanceTicker: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
});
