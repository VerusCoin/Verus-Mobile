import {StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

const ACTION_ICON_OPACITY = 0.42;

export const createSignedOutSheetStyles = theme =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 22,
    },
    bodyTight: {
      paddingTop: 2,
    },
    bodyShort: {
      paddingBottom: 18,
    },
    bodyList: {
      paddingBottom: 20,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      ...fontStyle('semiBold'),
    },
    subtitle: {
      marginTop: 4,
      marginBottom: 12,
      color: theme.colors.textSubtle,
      fontSize: 13,
      ...fontStyle('regular'),
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      ...fontStyle('regular'),
    },
    listContent: {
      paddingBottom: 4,
    },
    primaryButtonText: {
      fontSize: 16,
    },
    actionList: {
      marginTop: 24,
    },
    actionRow: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
    },
    quietRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionIconContainer: {
      width: 30,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    quietActionIconContainer: {
      width: 26,
      height: 32,
      marginRight: 12,
    },
    actionIcon: {
      opacity: ACTION_ICON_OPACITY,
    },
    actionLabel: {
      flex: 1,
      paddingRight: 12,
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    quietRowText: {
      flex: 1,
      paddingRight: 12,
      color: theme.colors.textPrimary,
      fontSize: 14,
      ...fontStyle('semiBold'),
    },
  });

export default StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  bodyTight: {
    paddingTop: 2,
  },
  bodyShort: {
    paddingBottom: 18,
  },
  bodyList: {
    paddingBottom: 20,
  },
  title: {
    color: Colors.quinaryColor,
    fontSize: 20,
    ...fontStyle('semiBold'),
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: Colors.verusDarkGray,
    fontSize: 13,
    ...fontStyle('regular'),
  },
  bodyText: {
    color: Colors.quaternaryColor,
    fontSize: 16,
    lineHeight: 24,
    ...fontStyle('regular'),
  },
  listContent: {
    paddingBottom: 4,
  },
  primaryButtonText: {
    fontSize: 16,
  },
  actionList: {
    marginTop: 24,
  },
  actionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quietRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIconContainer: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quietActionIconContainer: {
    width: 26,
    height: 32,
    marginRight: 12,
  },
  actionIcon: {
    opacity: ACTION_ICON_OPACITY,
  },
  actionLabel: {
    flex: 1,
    paddingRight: 12,
    color: Colors.quinaryColor,
    fontSize: 16,
    ...fontStyle('semiBold'),
  },
  quietRowText: {
    flex: 1,
    paddingRight: 12,
    color: '#1A1A1A',
    fontSize: 14,
    ...fontStyle('semiBold'),
  },
});
