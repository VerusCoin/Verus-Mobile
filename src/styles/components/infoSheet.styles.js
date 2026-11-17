import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

// Owner-approved Price and route spacing. Other information sheets keep the
// canonical layout unless they explicitly opt into the compact variant.
export const COMPACT_INFO_SHEET_METRICS = {
  paddingTop: 12,
  paddingBottom: 16,
  headerHeight: 28,
  headerGap: 6,
  actionGap: 12,
};

export const createInfoSheetStyles = (theme, {compact = false} = {}) => {
  const metrics = COMPACT_INFO_SHEET_METRICS;
  return StyleSheet.create({
    topic: {gap: 4, marginBottom: 20},
    topicTitle: {...theme.typography.titleRow, color: theme.colors.textPrimary},
    topicBody: {...theme.typography.bodySm, color: theme.colors.textSecondary},
    requestSheetBody: {
      flexShrink: 1,
      paddingHorizontal: compact ? 16 : theme.spacing.sheetPadding,
      paddingTop: compact ? metrics.paddingTop : 8,
      paddingBottom: compact ? metrics.paddingBottom : 22,
    },
    requestSheetHeader: {
      minHeight: compact ? metrics.headerHeight : 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: compact ? metrics.headerGap : 14,
    },
    requestSheetHeaderText: {flex: 1, minWidth: 0},
    requestSheetTitle: {
      color: theme.colors.textPrimary,
      ...(compact ? theme.typography.titleSheetCompact : theme.typography.titleSheet),
    },
    requestSheetSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      marginTop: 4,
      ...fontStyle('regular'),
    },
    requestSheetActionButton: {marginTop: compact ? metrics.actionGap : 22},
  });
};
