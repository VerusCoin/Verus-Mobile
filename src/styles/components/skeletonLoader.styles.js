import {StyleSheet} from 'react-native';

const createSkeletonLoaderStyles = theme =>
  StyleSheet.create({
    container: {
      alignSelf: 'stretch',
    },
    block: {
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.10)'
        : theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    section: {
      marginTop: theme.spacing.md,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    rowGroup: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    row: {
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowLabel: {
      marginBottom: 7,
    },
  });

export default createSkeletonLoaderStyles;
