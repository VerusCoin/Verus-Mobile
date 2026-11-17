import {StyleSheet} from 'react-native';
import {APP_BUTTON_HEIGHT} from './appButton.styles';

export const NFC_TAP_SYMBOL_SIZE = 132;
export const NFC_TAP_CIRCLE_SIZE = 96;
const ACTION_GAP = 10;

// Reserve two actions at their resolved height so content stays stable.
const createNfcTapStyles = (theme, buttonHeight = APP_BUTTON_HEIGHT) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    // Android: the middle of the screen, over the reader in most phones.
    bodyCentered: {
      justifyContent: 'center',
    },
    // iPhone: the top, above the iOS scan sheet and near the reader.
    bodyTop: {
      justifyContent: 'flex-start',
      paddingTop: 40,
    },
    symbol: {
      width: NFC_TAP_SYMBOL_SIZE,
      height: NFC_TAP_SYMBOL_SIZE,
    },
    layer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: NFC_TAP_CIRCLE_SIZE,
      height: NFC_TAP_CIRCLE_SIZE,
      borderRadius: NFC_TAP_CIRCLE_SIZE / 2,
    },
    ripple: {
      width: NFC_TAP_CIRCLE_SIZE,
      height: NFC_TAP_CIRCLE_SIZE,
      borderRadius: NFC_TAP_CIRCLE_SIZE / 2,
      borderWidth: 3,
      borderColor: theme.colors.success,
    },
    text: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
      maxWidth: 320,
    },
    title: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    detail: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    actions: {
      minHeight: buttonHeight * 2 + ACTION_GAP,
      justifyContent: 'flex-end',
      gap: ACTION_GAP,
    },
  });

export default createNfcTapStyles;
