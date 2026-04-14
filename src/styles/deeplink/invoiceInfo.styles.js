/*
  InvoiceInfo.styles 
  - Layout and section-card styles for the invoice request screen.
*/
import { StyleSheet } from 'react-native';
import Colors from '../../globals/colors';

// keep invoice request presentation centralized rather than embedded in the request screen.
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  requesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    zIndex: 2,
  },
  requesterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requesterTextContainer: {
    flex: 1,
  },
  requesterLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  requesterDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  unsignedCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  unsignedIconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  unsignedTextContainer: {
    flex: 1,
  },
  unsignedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  unsignedSubtitle: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionHelper: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    marginTop: -4,
  },
  sectionContent: {
    padding: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  detailRowPressable: {},
  detailLeft: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
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
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF6FF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  secondaryCtaContent: {
    height: 44,
  },
  secondaryCtaLabel: {
    color: Colors.primaryColor,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'none',
  },
  primaryCta: {
    width: '100%',
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 22,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -1,
    textAlign: 'center',
  },
  heroCurrency: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
