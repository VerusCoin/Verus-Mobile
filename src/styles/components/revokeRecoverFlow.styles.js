import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export default StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollViewport: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 24,
  },
  scrollContentCompact: {
    paddingTop: 16,
    paddingBottom: 48,
  },
  centeredScrollContent: {
    justifyContent: 'center',
  },
  stepCopy: {
    marginBottom: 24,
  },
  stepCopyCompact: {
    marginBottom: 16,
  },
  stepBody: {
    marginTop: 8,
  },
  choiceGroup: {
    gap: 8,
  },
  choiceRow: {
    minHeight: 82,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceRowCompact: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceIcon: {
    width: 42,
    height: 42,
    marginRight: 14,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconCompact: {
    width: 38,
    height: 38,
    marginRight: 12,
    borderRadius: 19,
  },
  choiceCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 12,
  },
  choiceTitle: {
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  choiceBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  notice: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  noticeCompact: {
    marginTop: 12,
    padding: 12,
  },
  noticeCopy: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  fieldGroup: {
    gap: 18,
  },
  networkList: {
    gap: 8,
  },
  networkRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 12,
  },
  networkName: {
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  networkTicker: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  sectionBody: {
    marginTop: 3,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  switchRow: {
    minHeight: 72,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 16,
  },
  switchTitle: {
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  switchBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  inputWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputFlexible: {
    minWidth: 0,
    flex: 1,
  },
  scanButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    marginTop: 24,
    textAlign: 'center',
  },
  loadingBody: {
    maxWidth: 340,
    marginTop: 8,
    textAlign: 'center',
  },
  reviewGroup: {
    marginBottom: 18,
  },
  reviewHeading: {
    paddingTop: 15,
    paddingBottom: 9,
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('semiBold'),
  },
  reviewRow: {
    minHeight: 48,
    paddingVertical: 10,
    gap: 5,
  },
  reviewLabel: {
    minWidth: 0,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  reviewValue: {
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  reviewTechnicalValue: {
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  acknowledgement: {
    minHeight: 56,
    marginTop: 2,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  acknowledgementCopy: {
    minWidth: 0,
    flex: 1,
    paddingLeft: 12,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  result: {
    alignItems: 'center',
    paddingTop: 12,
  },
  resultIcon: {
    width: 108,
    height: 108,
    marginBottom: 24,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    textAlign: 'center',
  },
  resultBody: {
    maxWidth: 360,
    marginTop: 10,
    textAlign: 'center',
  },
  resultDetails: {
    width: '100%',
    marginTop: 26,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  resultLabel: {
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  txidRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txid: {
    minWidth: 0,
    flex: 1,
    marginRight: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
