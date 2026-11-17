/*
  AuthenticationRequestInfo.styles
  - Theme-aware flat layout styles for the authentication request screen.
*/
import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createAuthenticationRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      marginBottom: 28,
    },
    mainSubtitle: {
      marginTop: 12,
      color: theme.colors.textSecondary,
    },
    sectionCard: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingVertical: theme.spacing.xs,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    sectionContent: {
      paddingTop: theme.spacing.xs,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    detailRowBorder: {},
    detailLeft: {
      flex: 1,
      minWidth: 0,
    },
    detailTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginBottom: 2,
      ...fontStyle('regular'),
    },
    detailSubtitle: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    requirementLabel: {
      flex: 1,
      marginRight: 12,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    requirementValue: {
      flexShrink: 1,
      maxWidth: '55%',
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    simpleInfoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    simpleInfoText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    footer: {
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.sm,
    },
    footerInfoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: theme.spacing.xs,
    },
    footerInfoIcon: {
      width: 16,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerInfoText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    autoLinkingSheetContainer: {
      paddingTop: 0,
    },
    autoLinkingSheetBody: {
      minHeight: 148,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sheetPadding,
      paddingVertical: theme.spacing.lg,
      gap: 8,
    },
    autoLinkingAnimation: {
      width: 96,
      height: 70,
    },
    autoLinkingTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
  });

export default createAuthenticationRequestInfoStyles;
