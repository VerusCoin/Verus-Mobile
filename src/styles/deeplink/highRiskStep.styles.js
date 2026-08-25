/*
  HighRiskStep.styles 
  - Visual styles for the identity update high-risk acknowledgment step.
*/
import { Platform, StyleSheet } from 'react-native';

// extracted step styling so the high-risk logic stays easier to review.
export default StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  authorityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  infoIconButton: {
    marginLeft: 6,
    padding: 2,
  },
  transitionContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginLeft: 4,
  },
  connectorColumn: {
    alignItems: 'center',
    width: 14,
    marginRight: 10,
    paddingTop: 4,
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#D4D4D4',
    borderRadius: 1,
  },
  transitionValues: {
    flex: 1,
    justifyContent: 'space-between',
  },
  authorityCurrent: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    marginBottom: 6,
  },
  authorityTarget: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
  },
  authorityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    paddingBottom: 14,
  },
  outcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginBottom: 12,
  },
  outcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outcomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  outcomeDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 2,
  },
  outcomeBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
  },
  badgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeIconLg: {
    marginRight: 6,
  },
  badgeTextLg: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  detailsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    marginBottom: 12,
  },
  detailsSection: {
    marginBottom: 4,
  },
  detailsSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 12,
    marginTop: 8,
  },
  detailsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addressRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  valueBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 10,
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  valueData: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  stickyAck: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ackSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
});
