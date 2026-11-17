/*
  IdentityUpdateRequestInfo.styles
  - Theme-aware layout styles for the identity update request flow.
*/
import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const monospaceFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createIdentityUpdateRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    stepHeader: {
      height: 44,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 0,
      paddingBottom: 0,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      marginBottom: 28,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: 8,
      ...fontStyle('regular'),
    },
    footer: {
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.sm,
    },
    footerDetailsList: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      marginBottom: 24,
    },
    footerDetailRow: {
      minWidth: 0,
      minHeight: 45,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerDetailRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footerDetailLabel: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginRight: 12,
      minWidth: 112,
      ...fontStyle('regular'),
    },
    footerDetailValue: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    footerChangeValueStack: {
      flex: 1,
      minWidth: 0,
      alignItems: 'stretch',
      gap: 3,
    },
    footerStackedDetailValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    footerDetailValueDanger: {
      color: theme.colors.dangerText,
    },
    rawDataSheetContent: {
      flexShrink: 1,
      minHeight: 0,
      paddingHorizontal: theme.spacing.sheetPadding,
      paddingTop: 22,
      paddingBottom: theme.spacing.sheetPadding,
    },
    rawDataSheetTitle: {
      color: theme.colors.textPrimary,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    rawDataSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      marginBottom: 8,
    },
    rawDataSheetLabel: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    rawDataSheetCopyButton: {
      marginRight: -10,
    },
    rawDataSheetScroll: {
      flexShrink: 1,
      minHeight: 0,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    rawDataSheetScrollContent: {
      padding: 12,
    },
    rawDataSheetValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      fontFamily: monospaceFont,
      fontWeight: Platform.OS === 'ios' ? '500' : 'normal',
    },
    rawDataSheetDone: {
      marginTop: 22,
    },
  });

export default createIdentityUpdateRequestInfoStyles;
