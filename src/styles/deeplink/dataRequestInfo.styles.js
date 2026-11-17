import {StyleSheet} from 'react-native';
import createAppEncryptionRequestInfoStyles from './appEncryptionRequestInfo.styles';

const createDataRequestInfoStyles = theme => ({
  ...createAppEncryptionRequestInfoStyles(theme),
  ...StyleSheet.create({
    section: {},
    body: {...theme.typography.bodySm, color: theme.colors.textSecondary},
    value: {...theme.typography.bodyMd, color: theme.colors.textPrimary},
    field: {marginTop: 10},
    fieldLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 3,
    },
    notice: {paddingBottom: 20},
    noticeTitle: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    error: {
      ...theme.typography.bodySm,
      color: theme.colors.danger,
    },
    loading: {paddingBottom: 24, gap: 16},
  }),
});

export default createDataRequestInfoStyles;
