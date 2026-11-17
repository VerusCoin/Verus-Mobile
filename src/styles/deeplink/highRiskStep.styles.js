/*
  HighRiskStep.styles
  - Theme-aware visual styles for the identity update high-risk review step.
*/
import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const monospaceFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createHighRiskStepStyles = theme =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    summaryPanel: {
      marginTop: 12,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.md,
    },
    panelLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    changeList: {
      marginTop: 14,
    },
    changeRow: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingVertical: 15,
      gap: theme.spacing.md,
    },
    changeRowFirst: {
      borderTopWidth: 0,
      paddingTop: 6,
    },
    changeRowLast: {
      paddingBottom: 4,
    },
    changeMain: {
      flex: 1,
      minWidth: 0,
    },
    changeKicker: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    changeKickerWarning: {
      color: theme.colors.warningText,
    },
    changeKickerDanger: {
      color: theme.colors.dangerText,
    },
    changeValue: {
      marginTop: 6,
      color: theme.colors.textPrimary,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    changeCaption: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    changeViewGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    changeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    changeLine: {
      marginTop: 8,
    },
    changeLineLabel: {...theme.typography.labelSm, color: theme.colors.textSecondary},
    changeLineValue: {marginTop: 2, ...theme.typography.bodyMd, color: theme.colors.textSecondary},
    changeLineValueEmphasis: {
      color: theme.colors.textPrimary,
      ...fontStyle('semiBold'),
    },
    changeLineValueMono: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: monospaceFont,
      fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
    },
    changeView: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    quietNote: {
      marginTop: 18,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    sheetContent: {
      flexShrink: 1,
      minHeight: 0,
      paddingHorizontal: theme.spacing.sheetPadding,
      paddingTop: 22,
      paddingBottom: theme.spacing.sheetPadding,
    },
    sheetScroll: {
      flexShrink: 1,
      minHeight: 0,
    },
    sheetScrollContent: {
      paddingBottom: 2,
    },
    sheetTitle: {
      color: theme.colors.textPrimary,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    sheetCopy: {
      marginTop: 12,
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    sheetRows: {
      marginTop: 18,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    sheetRow: {
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    sheetRowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    sheetRowCopy: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    sheetAckRows: {
      marginTop: 10,
      gap: 8,
    },
    sheetAckRow: {
      borderRadius: theme.rounded.sm,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    sheetAckLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    sheetAckValue: {
      marginTop: 3,
      color: theme.colors.textPrimary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      fontFamily: monospaceFont,
      fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
    },
    detailRows: {
      marginTop: 18,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    detailRow: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    detailValue: {
      marginTop: 4,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontFamily: monospaceFont,
      fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
    },
    detailRisk: {
      marginTop: 14,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    sheetButton: {
      marginTop: 22,
    },
  });

export default createHighRiskStepStyles;
