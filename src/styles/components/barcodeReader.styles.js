import {StyleSheet} from 'react-native';

// The camera window (owner chose variation B on 2026-10-22): a rounded window
// in the page, a rounded viewfinder, and states that keep the window in place.
export const SCANNER_WINDOW_RADIUS = 24;
export const SCANNER_FRAME_SIZE = 232;
export const SCANNER_FRAME_RADIUS = 28;
export const SCANNER_FRAME_STROKE = 4;
export const SCANNER_FRAME_CORNER = 44;
export const SCANNER_SYMBOL_SIZE = 96;
// The camera is dark in both appearances, so its overlays use fixed colors.
export const SCANNER_CAMERA_SURFACE = '#0B0D10';
export const SCANNER_VEIL = 'rgba(0, 0, 0, 0.34)';
export const SCANNER_CONTROL_FILL = 'rgba(0, 0, 0, 0.42)';
export const SCANNER_READ_COLOR = '#64C875';

const createBarcodeReaderStyles = theme =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    window: {
      flex: 1,
      borderRadius: SCANNER_WINDOW_RADIUS,
      overflow: 'hidden',
      backgroundColor: SCANNER_CAMERA_SURFACE,
    },
    windowOff: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      backgroundColor: theme.colors.surfaceMuted,
    },
    symbol: {
      width: SCANNER_SYMBOL_SIZE,
      height: SCANNER_SYMBOL_SIZE,
      borderRadius: SCANNER_SYMBOL_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    detail: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      maxWidth: 300,
      textAlign: 'center',
    },
    torch: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reading: {
      position: 'absolute',
      bottom: 16,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    readingText: {
      ...theme.typography.labelMd,
      color: '#FFFFFF',
      marginLeft: theme.spacing.sm,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screenContent: {
      paddingTop: 24,
    },
  });

export default createBarcodeReaderStyles;
