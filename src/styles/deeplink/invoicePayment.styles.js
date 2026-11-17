import {StyleSheet} from 'react-native';

export default (theme, compact = false) =>
  StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    scroll: {flex: 1},
    content: {paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24},
    title: {
      ...(compact
        ? theme.typography.headlineCompact
        : theme.typography.headlineLg),
      color: theme.colors.textPrimary,
      marginBottom: compact ? 12 : 28,
    },
    compactRequester: {marginBottom: 12},
    stepTitle: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: 8,
      marginBottom: 22,
    },
    amount: {
      ...theme.typography.headlineMd,
      color: theme.colors.textPrimary,
      marginTop: 0,
      marginBottom: compact ? 12 : 20,
    },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowLabel: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    rowValue: {
      ...theme.typography.labelMd,
      color: theme.colors.textPrimary,
      flex: 1.6,
      textAlign: 'right',
    },
    rowAction: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    label: {
      ...theme.typography.labelMd,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    text: {...theme.typography.bodySm, color: theme.colors.textSecondary},
    footnote: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    selection: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selected: {backgroundColor: theme.colors.successBackground},
    selectionText: {flex: 1, minWidth: 0},
    selectionTitle: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
    },
    selectionDetail: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    selectionIcon: {width: 24, flexShrink: 0, alignItems: 'center'},
    selectionSection: {marginTop: 24},
    groupLabel: {
      ...theme.typography.labelMd,
      color: theme.colors.textSecondary,
      marginTop: 16,
      marginBottom: 10,
    },
    notice: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.warningBackground,
      marginTop: 16,
    },
    footer: {paddingTop: 12, backgroundColor: theme.colors.background},
    sheet: {flexShrink: 1, padding: 20},
    sheetScroll: {flexShrink: 1, marginVertical: 12},
    state: {paddingVertical: 24, gap: 12},
    technicalRow: {paddingVertical: 16, gap: 8},
    technicalValue: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    copyRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
    form: {gap: 20},
    resultAmount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 24,
    },
    resultAmountText: {
      ...theme.typography.headlineMd,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    loadingTitle: {
      ...theme.typography.headlineMd,
      color: theme.colors.textPrimary,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 20,
    },
  });
