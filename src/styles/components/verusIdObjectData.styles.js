/*
  VerusIdObjectData.styles 
  - Shared badge and content-card styles for VerusID object rendering.
*/
import { Platform, StyleSheet } from 'react-native';
import { fontStyle } from '../../globals/fonts';
import Colors from '../../globals/colors';

// keep VerusID change-card presentation centralized and out of the data renderer.
export default StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
  cmmDescLine: {
    color: Colors.verusDarkGray,
    fontSize: 12,
  },
  cmmDescMuted: {
    color: Colors.verusDarkGray,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  contentAccordion: {
    backgroundColor: '#F3F5F8',
  },
  contentAccordionTitle: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  cmmCard: {
    backgroundColor: '#FBFCFE',
    borderColor: '#E7ECF2',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
  },
  cmmCardDark: {
    backgroundColor: '#17253A',
    borderColor: '#38527A',
  },
  cmmCardAddPanel: {
    backgroundColor: '#FBFFFC',
  },
  cmmCardAddPanelDark: {
    backgroundColor: '#102B24',
    borderColor: 'rgba(100, 200, 117, 0.34)',
  },
  cmmCardPrivatePanel: {
    backgroundColor: '#FBFDFF',
  },
  cmmCardPrivatePanelDark: {
    backgroundColor: '#14263E',
    borderColor: 'rgba(49, 101, 212, 0.42)',
  },
  cmmCardRemovePanel: {
    backgroundColor: '#FFFAFA',
  },
  cmmCardRemovePanelDark: {
    backgroundColor: '#301B24',
    borderColor: 'rgba(255, 107, 117, 0.38)',
  },
  cmmCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cmmCardHeaderWithKey: {
    marginBottom: 0,
  },
  cmmCardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cmmCardKeyId: {
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  cmmCardKeyIdLine: {
    marginBottom: 12,
  },
  cmmCardKeyIdDark: {
    color: '#A9B6CA',
  },
  cmmCardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    color: '#111827',
  },
  cmmCardTitleDark: {
    color: '#F4F7FB',
  },
  cmmCardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  cmmCardDescBlock: {
    paddingVertical: 4,
    marginBottom: 6,
  },
  cmmCardDescLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 2,
  },
  cmmCardDescValue: {
    fontSize: 13,
    color: '#4B5565',
    lineHeight: 19,
  },
  cmmCardDescValueDark: {
    color: '#A9B6CA',
  },
  encryptedKeyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF6FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  encryptedKeyInfoDark: {
    backgroundColor: 'rgba(49, 101, 212, 0.18)',
  },
  encryptedKeyInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.primaryColor,
  },
  encryptedKeyInfoTextDark: {
    color: '#8FB1FF',
  },
  contentReviewRoot: {
    flex: 1,
  },
  contentReviewHeader: {
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  contentSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  contentSummaryTile: {
    flex: 1,
    minHeight: 62,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F5F8',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  contentSummaryTileDark: {
    backgroundColor: '#17253A',
  },
  contentSummaryAddTile: {
    backgroundColor: '#F1F8F2',
  },
  contentSummaryAddTileDark: {
    backgroundColor: '#102B24',
  },
  contentSummaryRemoveTile: {
    backgroundColor: '#FFF2F2',
  },
  contentSummaryRemoveTileDark: {
    backgroundColor: '#301B24',
  },
  contentSummaryNumber: {
    color: '#111827',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  contentSummaryNumberDark: {
    color: '#F4F7FB',
  },
  contentSummaryAddNumber: {
    color: '#3C9449',
  },
  contentSummaryAddNumberDark: {
    color: '#64C875',
  },
  contentSummaryRemoveNumber: {
    color: '#D92A33',
  },
  contentSummaryRemoveNumberDark: {
    color: '#FF6B75',
  },
  contentSummaryLabel: {
    color: '#606A7A',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 4,
  },
  contentSummaryLabelDark: {
    color: '#A9B6CA',
  },
  contentSummaryChip: {
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F1F8F2',
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  contentSummaryChipDark: {
    backgroundColor: 'rgba(100, 200, 117, 0.18)',
  },
  contentSummaryChipRemove: {
    backgroundColor: '#FFF2F2',
  },
  contentSummaryChipRemoveDark: {
    backgroundColor: 'rgba(255, 107, 117, 0.18)',
  },
  contentSummaryChipText: {
    color: '#3C9449',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  contentSummaryChipTextDark: {
    color: '#64C875',
  },
  contentSummaryChipRemoveText: {
    color: '#D92A33',
  },
  contentSummaryChipRemoveTextDark: {
    color: '#FF6B75',
  },
  contentReviewScroll: {
    flex: 1,
  },
  contentReviewScrollContent: {
    paddingBottom: 18,
  },
  contentReviewNote: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
  },
  contentReviewBody: {
    paddingTop: 4,
  },
  contentFilterContainer: {
    flexDirection: 'row',
    borderRadius: 13,
    backgroundColor: '#EEF1F6',
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  contentFilterContainerDark: {
    backgroundColor: '#111F31',
  },
  contentFilterButton: {
    flex: 1,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  contentFilterButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  contentFilterButtonActiveDark: {
    backgroundColor: '#263A58',
    shadowOpacity: 0,
  },
  contentFilterLabel: {
    color: '#687386',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  contentFilterLabelDark: {
    color: '#A9B6CA',
  },
  contentFilterLabelActive: {
    color: '#0B1120',
  },
  contentFilterLabelActiveDark: {
    color: '#F4F7FB',
  },
  contentReviewEmptyState: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7ECF2',
    borderRadius: 18,
    backgroundColor: '#FBFCFE',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  contentReviewEmptyStateDark: {
    borderColor: '#38527A',
    backgroundColor: '#17253A',
  },
  contentReviewEmptyText: {
    color: '#657083',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  contentReviewEmptyTextDark: {
    color: '#A9B6CA',
  },
  privateInfoFallback: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7ECF2',
    borderRadius: 18,
    backgroundColor: '#FBFCFE',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
  },
  privateInfoFallbackDark: {
    borderColor: '#38527A',
    backgroundColor: '#17253A',
  },
  privateInfoFallbackTitle: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  privateInfoFallbackTitleDark: {
    color: '#F4F7FB',
  },
  privateInfoFallbackItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  privateInfoFallbackItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7ECF2',
  },
  privateInfoFallbackItemTitle: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
    ...fontStyle('semiBold'),
  },
  privateInfoFallbackItemTitleDark: {
    color: '#F4F7FB',
  },
  privateInfoFallbackItemDescription: {
    color: '#606A7A',
    fontSize: 14,
    lineHeight: 20,
  },
  privateInfoFallbackIdentifier: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  privateInfoFallbackItemDescriptionDark: {
    color: '#A9B6CA',
  },
  privateInfoFallbackDividerDark: {
    borderBottomColor: '#38527A',
  },
});
