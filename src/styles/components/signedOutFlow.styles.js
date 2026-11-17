import {StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

export const createSignedOutFlowStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.stepTop,
    },
    contentSmallDevice: {
      paddingTop: theme.spacing.stepTopSmallDevice,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: theme.spacing.stepTop,
      paddingBottom: 24,
    },
    scrollContentSmallDevice: {
      paddingTop: theme.spacing.stepTopSmallDevice,
    },
    scrollContentKeyboardFooterClearance: {
      paddingBottom: theme.spacing.keyboardFooterClearance,
    },
    // Applies to `content` and `scrollContent` on every window size.
    afterHeaderTitle: {
      paddingTop: theme.spacing.stepTopWithHeaderTitle,
    },
    form: {
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
    },
    title: {
      marginBottom: theme.spacing.stepTitleMargin,
      color: theme.colors.textPrimary,
      ...theme.typography.headlineLg,
    },
    titleSmallDevice: {
      marginBottom: theme.spacing.stepTitleMarginSmallDevice,
      ...theme.typography.headlineCompact,
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      ...fontStyle('regular'),
    },
  });

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 54,
  },
  contentSmallDevice: {
    paddingTop: 28,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 54,
    paddingBottom: 24,
  },
  scrollContentSmallDevice: {
    paddingTop: 20,
  },
  scrollContentKeyboardFooterClearance: {
    paddingBottom: 96,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  title: {
    marginBottom: 28,
    color: Colors.quinaryColor,
    fontSize: 31,
    lineHeight: 38,
    ...fontStyle('semiBold'),
  },
  titleSmallDevice: {
    marginBottom: 12,
    fontSize: 26,
    lineHeight: 32,
  },
  body: {
    color: Colors.quaternaryColor,
    fontSize: 16,
    lineHeight: 24,
    ...fontStyle('regular'),
  },
});
