import {Platform, StyleSheet} from 'react-native';

const createDataApprovalListStyles = theme =>
  StyleSheet.create({
    list: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      gap: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    openRow: {
      alignItems: 'flex-start',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    marker: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openMarker: {
      borderRadius: theme.rounded.md,
      backgroundColor: theme.colors.textPrimary,
    },
    number: {...theme.typography.labelMd, color: theme.colors.textSecondary},
    openNumber: {color: theme.colors.background},
    content: {flex: 1, minWidth: 0},
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      minHeight: 24,
    },
    title: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    waitingTitle: {color: theme.colors.textSecondary},
    value: {marginTop: theme.spacing.sm},
    undoAction: {
      minWidth: 44,
      minHeight: 44,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingLeft: theme.spacing.sm,
    },
    detailsAction: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    detailField: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    detailLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    detailLabel: {
      ...theme.typography.labelMd,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    detailValue: {...theme.typography.bodyMd, color: theme.colors.textPrimary},
    technicalValue: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginTop: theme.spacing.sm,
    },
    bytes: {
      ...theme.typography.bodyMd,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    size: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    resetNotice: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    resetNoticeText: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
    },
    itemNotice: {marginTop: theme.spacing.md},
    sheetBytes: {
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });

export default createDataApprovalListStyles;
