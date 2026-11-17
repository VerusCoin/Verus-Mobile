import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createAppEncryptionRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      marginBottom: 28,
    },
    mainSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: 12,
      ...fontStyle('regular'),
    },
    warningCard: {
      paddingVertical: 16,
      marginBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    warningHeader: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8},
    warningTitle: {...theme.typography.labelMd, color: theme.colors.textSecondary},
    warningText: {...theme.typography.bodyMd, color: theme.colors.textPrimary},
    warningEmphasis: {...theme.typography.bodyMd, ...fontStyle('semiBold'), color: theme.colors.textPrimary, marginTop: 8},
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
    footerWarningCard: {
      borderRadius: 16,
      backgroundColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.10)'
        : '#FFF7EC',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    footerWarningTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      letterSpacing: 0,
      marginBottom: 5,
      ...fontStyle('semiBold'),
    },
    footerWarningText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
  });

export default createAppEncryptionRequestInfoStyles;
