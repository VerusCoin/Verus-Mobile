import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';
import {createInfoSheetStyles} from './infoSheet.styles';

const createDeepLinkRequestReviewStyles = theme =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    ...createInfoSheetStyles(theme),
    requestSheetScrollFrame: {
      position: 'relative',
      flexGrow: 0,
      flexShrink: 1,
      overflow: 'hidden',
    },
    requestSheetScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    requestSheetContent: {
      paddingBottom: theme.spacing.xs,
    },
    requestSheetScrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 46,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    requestSheetScrollCueChevron: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestSheetState: {
      minHeight: 112,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
    },
    requestSheetStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      textAlign: 'center',
      marginBottom: 4,
      ...fontStyle('semiBold'),
    },
    requestSheetStateText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      textAlign: 'center',
      marginTop: 8,
      ...fontStyle('regular'),
    },
    requestInfoSection: {
      marginTop: theme.spacing.md,
    },
    requestInfoSectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      marginBottom: 6,
      ...fontStyle('semiBold'),
    },
    requestInfoRows: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    requestInfoRow: {
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    requestInfoRowWithAction: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    requestInfoRowText: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
    requestInfoLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      marginBottom: 3,
      ...fontStyle('semiBold'),
    },
    requestInfoValue: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
  });

export default createDeepLinkRequestReviewStyles;
