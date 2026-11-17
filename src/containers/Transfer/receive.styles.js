import {Platform, StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export const createReceiveListStyles = theme =>
  StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    header: {
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
    },
    // Match the search field spacing of Send's Select asset.
    headerWithSearch: {paddingTop: 24, paddingBottom: 14},
    headerScrolled: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    list: {paddingBottom: 20},
    // With the row's 12-point padding, the first row starts 24 points under
    // the header.
    listWithoutSearch: {paddingTop: 12},
    // Asset rows match the wallet (Home) asset rows.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    logo: {marginRight: 16},
    rowBody: {flex: 1, minWidth: 0},
    rowTop: {flexDirection: 'row', alignItems: 'center'},
    assetName: {
      ...theme.typography.titleRow,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    fiat: {
      marginLeft: 12,
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    unavailable: {
      marginLeft: 12,
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    crypto: {
      ...theme.typography.bodySm,
      marginTop: 2,
      color: theme.colors.textSecondary,
    },
    empty: {alignItems: 'center', paddingHorizontal: 32, paddingTop: 48},
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });

export const createReceiveSheetStyles = theme =>
  StyleSheet.create({
    sheet: {paddingTop: 12},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerSpacer: {width: 34, height: 34},
    sheetTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 22,
      ...fontStyle('semiBold'),
    },
    close: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    description: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    list: {paddingHorizontal: 16, paddingBottom: 8},
    group: {marginBottom: 20},
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    groupLogo: {
      width: 28,
      height: 28,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    groupTitle: {
      ...theme.typography.labelCaps,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 62,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    cardName: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    balance: {alignItems: 'flex-end', marginRight: 8},
    balanceValue: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 20,
      ...fontStyle('bold'),
    },
    balanceTicker: {
      marginTop: 1,
      color: theme.colors.textSubtle,
      fontSize: 11,
      lineHeight: 14,
      ...fontStyle('regular'),
    },
  });

export const createReceiveDetailsStyles = theme =>
  StyleSheet.create({
    safe: {flex: 1, backgroundColor: theme.colors.background},
    root: {flex: 1},
    scroll: {flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24},
    scrollTight: {paddingTop: 4, paddingBottom: 12},
    header: {marginBottom: 12},
    titleRow: {flexDirection: 'row', alignItems: 'center'},
    title: {
      ...theme.typography.headlineMd,
      flexShrink: 1,
      marginLeft: 12,
      color: theme.colors.textPrimary,
    },
    cardContext: {
      marginLeft: 52,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    contextText: {
      flexShrink: 1,
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 22,
      ...fontStyle('regular'),
    },
    receiveBody: {flexGrow: 1, justifyContent: 'center'},
    qrWrap: {alignItems: 'center', marginBottom: 24},
    qrWrapTight: {marginBottom: 16},
    qrSurface: {backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20},
    qrSurfaceTight: {padding: 12, borderRadius: 18},
    label: {
      marginBottom: 8,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    address: {
      flex: 1,
      marginRight: 8,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('medium'),
    },
    // An absent address is a message rather than a record: normal body copy
    // that wraps instead of identifier type that truncates.
    addressMissing: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    // Raw addresses, hashes and identifiers use the established platform
    // monospace convention. Human VerusID names keep the normal type above.
    identifier: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
    footer: {paddingTop: 16, backgroundColor: theme.colors.background},
    footerCompact: {paddingTop: 8},

    // Terminal page states (missing Asset, no receive-compatible Card,
    // unresolved address). One centred statement and one safe exit.
    stateScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    stateTitle: {
      ...theme.typography.headlineMd,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    stateBody: {
      marginTop: 10,
      marginBottom: 24,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    stateAction: {width: '100%', maxWidth: 360},
    stateActionAfterTitle: {marginTop: 24},

    // Payment-request task. Full-screen stepped composition that mirrors the
    // canonical Gift Card flow: 20-point side inset, 24-point top inset and a
    // 28-point bottom inset inside the fading scroll viewport.
    wizardRoot: {flex: 1, backgroundColor: theme.colors.background},
    wizardViewport: {flex: 1},
    wizardContent: {flexGrow: 1, paddingTop: 24, paddingBottom: 28},
    wizardResultCompact: {paddingTop: 8, paddingBottom: 8},
    amountRow: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center'},
    // Match SendWizardAmount's editable 40/48 amount and 16-radius mode chip.
    amountInput: {
      minWidth: 32,
      maxWidth: '100%',
      flexShrink: 1,
      padding: 0,
      textAlign: 'center',
      color: theme.colors.textPrimary,
      fontSize: 40,
      lineHeight: 48,
      ...fontStyle('bold'),
    },
    amountMeasure: {position: 'absolute', opacity: 0, maxWidth: undefined},
    currency: {
      flexShrink: 1,
      marginLeft: 8,
      color: theme.colors.textSecondary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    modeChip: {
      alignSelf: 'center',
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 4,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    modeText: {color: theme.colors.textPrimary, fontSize: 14, lineHeight: 20, ...fontStyle('semiBold')},
    modeIcon: {marginLeft: 6},
    requestRows: {marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border},
    error: {
      marginTop: 12,
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
  });
