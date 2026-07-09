import { StyleSheet } from 'react-native';

/**
 * Shared card styling for the marketplace makeoffer/takeoffer/closeoffer
 * confirm screens — matches the modern white/bordered card language used
 * elsewhere in the wallet (see styles/deeplink/invoiceInfo.styles.js
 * sectionCard/detailRow) rather than the older flat gray box, so the asset
 * hero image (MarketplaceAssetPreview) reads as one cohesive listing card.
 */
export default StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  label: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  value: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  valueMono: {
    color: '#1A1A1A',
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#E8E8E8',
  },
  note: {
    color: '#888888',
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
