import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppSwitch from '../../../components/AppSwitch';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {SignedInEdgeFade} from '../../../components/SignedInActionBar';
import WalletAvatar from '../../../components/WalletAvatar';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';

const SCROLL_END_THRESHOLD = 8;
const SCROLL_CUE_HEIGHT = 46;
const EMPTY_SCROLL_METRICS = {
  contentHeight: 0,
  layoutHeight: 0,
  offsetY: 0,
};

const hasSameScrollMetrics = (left, right) =>
  left.contentHeight === right.contentHeight &&
  left.layoutHeight === right.layoutHeight &&
  left.offsetY === right.offsetY;

const createStyles = theme =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollFrame: {
      flex: 1,
    },
    scrollCue: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
      height: SCROLL_CUE_HEIGHT,
      alignItems: 'center',
    },
    scrollCueFade: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 0,
    },
    scrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      width: '100%',
      maxWidth: 430,
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingTop: 3,
      paddingBottom: 34,
    },
    homeContent: {
      paddingTop: 12,
      paddingBottom: 16,
    },
    title: {
      ...theme.typography.headlineMd,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    titleSpacing: {
      marginBottom: 23,
    },
    section: {
      marginBottom: 22,
    },
    compactSection: {
      marginBottom: 18,
    },
    sectionTitle: {
      marginBottom: 5,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    row: {
      position: 'relative',
      minHeight: 54,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      borderRadius: 10,
    },
    choiceRow: {
      minHeight: 58,
    },
    plainRow: {
      minHeight: 62,
    },
    plainRowTitle: {
      ...theme.typography.titleRow,
    },
    plainRowValue: {
      ...theme.typography.bodySm,
    },
    plainDivider: {
      left: 0,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    rowSelected: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    rowIcon: {
      width: 23,
      height: 28,
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowCopy: {
      minWidth: 0,
      flex: 1,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14.5,
      lineHeight: 19,
      ...fontStyle('semiBold'),
    },
    rowDescription: {
      marginTop: 1,
      color: theme.colors.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    rowValue: {
      flexShrink: 1,
      maxWidth: 110,
      marginLeft: 10,
      color: theme.colors.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      textAlign: 'right',
      ...fontStyle('regular'),
    },
    rowTrailing: {
      flexShrink: 0,
      marginLeft: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowChevron: {
      flexShrink: 0,
      marginLeft: 6,
    },
    divider: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 37,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    dangerText: {
      color: theme.colors.danger,
    },
    profile: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 22,
    },
    profileIcon: {
      width: 36,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileCopy: {
      minWidth: 0,
      flex: 1,
    },
    profileName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    profileMeta: {
      marginTop: 2,
      color: theme.colors.textSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    appSummary: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      marginTop: 1,
      marginBottom: 20,
    },
    appLogo: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: Platform.OS === 'ios' ? 9.5 : 21,
      ...(Platform.OS === 'ios' && {borderCurve: 'continuous'}),
      backgroundColor: 'transparent',
    },
    appLogoImage: {
      width: 42,
      height: 42,
    },
    appSummaryCopy: {
      minWidth: 0,
      flex: 1,
    },
    appSummaryName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    appSummaryMeta: {
      marginTop: 2,
      color: theme.colors.textSubtle,
      fontSize: 11.5,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    notice: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    dangerNotice: {
      backgroundColor: theme.isDark
        ? 'rgba(255, 107, 117, 0.12)'
        : 'rgba(242, 45, 55, 0.08)',
    },
    noticeCopy: {
      minWidth: 0,
      flex: 1,
    },
    noticeTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    noticeBody: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    footer: {
      paddingTop: 10,
      backgroundColor: theme.colors.background,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 10,
    },
    footerButton: {
      flex: 1,
    },
    // The primary action carries the longer label ("Reset password" is 127 dp
    // and a half-width button leaves 129 dp on a 360 dp window).
    footerPrimaryButton: {
      flex: 1.6,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 14,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
  });

const stylesByTheme = new WeakMap();
const getStyles = theme => {
  if (!stylesByTheme.has(theme)) {
    stylesByTheme.set(theme, createStyles(theme));
  }

  return stylesByTheme.get(theme);
};

const SettingsScrollCue = ({styles, theme}) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    pointerEvents="none"
    style={styles.scrollCue}>
    <SignedInEdgeFade
      height={SCROLL_CUE_HEIGHT}
      style={styles.scrollCueFade}
    />
    <View style={styles.scrollCueChevron}>
      <MaterialCommunityIcons
        color={theme.colors.textSubtle}
        name="chevron-down"
        size={15}
      />
    </View>
  </View>
);

export const SettingsScreen = ({
  avoidKeyboard = false,
  children,
  contentContainerStyle,
  footer,
  home = false,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  renderHeader,
  safeAreaEdges,
  showScrollCue = true,
  testID,
}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);
  const scrollRef = useRef(null);
  const [scrollMetrics, setScrollMetrics] = useState(EMPTY_SCROLL_METRICS);
  const Container = avoidKeyboard ? KeyboardAvoidingView : View;
  const containerProps = avoidKeyboard
    ? {
        behavior: Platform.OS === 'ios' ? 'padding' : undefined,
        keyboardVerticalOffset: 68,
      }
    : {};
  const edges =
    safeAreaEdges || (home ? ['top', 'left', 'right'] : ['left', 'right']);
  const isScrollable =
    scrollMetrics.layoutHeight > 0 &&
    scrollMetrics.contentHeight >
      scrollMetrics.layoutHeight + SCROLL_END_THRESHOLD;
  const showBottomScrollCue =
    showScrollCue &&
    isScrollable &&
    scrollMetrics.offsetY + scrollMetrics.layoutHeight <
      scrollMetrics.contentHeight - SCROLL_END_THRESHOLD;
  const header = renderHeader
    ? renderHeader({showDivider: scrollMetrics.offsetY > 1})
    : null;

  const updateScrollMetrics = useCallback(nextMetrics => {
    setScrollMetrics(current => {
      const next = {
        ...current,
        ...nextMetrics,
      };

      return hasSameScrollMetrics(current, next) ? current : next;
    });
  }, []);

  const handleScroll = useCallback(
    event => {
      const {contentOffset, contentSize, layoutMeasurement} =
        event.nativeEvent;

      updateScrollMetrics({
        contentHeight: contentSize.height,
        layoutHeight: layoutMeasurement.height,
        offsetY: contentOffset.y,
      });
    },
    [updateScrollMetrics],
  );

  useEffect(() => {
    if (!isScrollable) return undefined;

    const timeout = setTimeout(() => {
      scrollRef.current?.flashScrollIndicators?.();
    }, 260);

    return () => clearTimeout(timeout);
  }, [isScrollable]);

  return (
    <SafeAreaView
      edges={edges}
      style={styles.screen}
      testID={testID}>
      <Container
        {...containerProps}
        style={styles.screen}>
        {header}
        <View style={styles.scrollFrame}>
          <ScrollView
            ref={scrollRef}
            bounces={false}
            contentContainerStyle={[
              styles.content,
              home && styles.homeContent,
              contentContainerStyle,
            ]}
            keyboardDismissMode={keyboardDismissMode}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            onContentSizeChange={(_, contentHeight) =>
              updateScrollMetrics({contentHeight})
            }
            onLayout={event =>
              updateScrollMetrics({
                layoutHeight: event.nativeEvent.layout.height,
              })
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={isScrollable}
            style={styles.scroll}>
            {children}
          </ScrollView>
          {showBottomScrollCue ? (
            <SettingsScrollCue styles={styles} theme={theme} />
          ) : null}
        </View>
        {footer}
      </Container>
    </SafeAreaView>
  );
};

export const SettingsTitle = ({children, subtitle}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.titleSpacing}>
      <Text accessibilityRole="header" style={styles.title}>
        {children}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

export const SettingsSection = ({children, compact = false, style, title}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <View style={[styles.section, compact && styles.compactSection, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View>{children}</View>
    </View>
  );
};

export const SettingsRow = ({
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  choice = false,
  danger = false,
  description,
  descriptionNumberOfLines = 2,
  disabled = false,
  // A short failure for this row, such as "Not saved. Try again.". It takes
  // the place of the description, in the danger color, and replaces an alert.
  error,
  external = false,
  hideDivider = false,
  icon,
  iconColor,
  last = false,
  leading,
  leadingStyle,
  onPress,
  plain = false,
  selected = false,
  showChevron,
  testID,
  title,
  trailing,
  value,
}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);
  const resolvedIconColor = danger
    ? theme.colors.danger
    : iconColor || theme.colors.textSubtle;
  const resolvedShowChevron =
    showChevron == null ? onPress && !trailing : showChevron;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : undefined)}
      accessibilityState={{disabled, ...accessibilityState}}
      activeOpacity={0.72}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={[
        styles.row,
        choice && styles.choiceRow,
        plain && styles.plainRow,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
      ]}
      testID={testID}>
      {leading ? (
        <View style={[styles.rowIcon, leadingStyle]}>{leading}</View>
      ) : null}
      {!leading && icon ? (
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons
            color={resolvedIconColor}
            name={icon}
            size={19}
          />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        {React.isValidElement(title) ? (
          title
        ) : (
          <Text style={[styles.rowTitle, plain && styles.plainRowTitle, danger && styles.dangerText]}>
            {title}
          </Text>
        )}
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.rowDescription, styles.dangerText]}>
            {error}
          </Text>
        ) : description ? (
          <Text
            numberOfLines={descriptionNumberOfLines}
            style={styles.rowDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <Text numberOfLines={1} style={[styles.rowValue, plain && styles.plainRowValue]}>
          {value}
        </Text>
      ) : null}
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
      {onPress && !disabled && resolvedShowChevron ? (
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name={external ? 'open-in-new' : 'chevron-right'}
          size={external ? 15 : 18}
          style={styles.rowChevron}
        />
      ) : null}
      {!last && !hideDivider ? <View style={[styles.divider, plain && styles.plainDivider]} /> : null}
    </TouchableOpacity>
  );
};

export const SettingsSwitchRow = ({
  busy = false,
  disabled = false,
  onValueChange,
  value,
  ...rowProps
}) => {
  const theme = useOnboardingTheme();

  return (
    <SettingsRow
      {...rowProps}
      accessibilityRole="switch"
      accessibilityState={{busy, checked: value}}
      choice
      disabled={busy || disabled}
      onPress={() => onValueChange(!value)}
      trailing={
        busy ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <View pointerEvents="none">
            <AppSwitch
              disabled={disabled}
              onValueChange={onValueChange}
              value={value}
            />
          </View>
        )
      }
    />
  );
};

// The lock icon is approved for this button only. AppButton passes the
// label color to the icon. Paper puts the icon in a box with a 12-point left
// and -4-point right margin; a 14-point label margin gives the old 10-point
// gap, and the 12-point right margin keeps icon and label centered as a group.
const LockWalletIcon = ({color}) => (
  <MaterialCommunityIcons color={color} name="lock-outline" size={19} />
);

const lockActionStyles = StyleSheet.create({
  label: {marginLeft: 14, marginRight: 12},
});

export const SettingsLockAction = ({onPress}) => (
  <AppButton
    icon={LockWalletIcon}
    labelStyle={lockActionStyles.label}
    onPress={onPress}
    testID="settings.lockWallet"
    variant="secondary">
    Lock wallet
  </AppButton>
);

export const SettingsProfileSummary = ({name, subtitle, walletAvatar}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);
  const normalizedWalletAvatar = normalizeWalletAvatar(walletAvatar);

  return (
    <View style={styles.profile}>
      <View style={styles.profileIcon}>
        {normalizedWalletAvatar ? (
          <WalletAvatar
            emojiSize={19}
            size={36}
            walletAvatar={normalizedWalletAvatar}
          />
        ) : (
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="wallet-outline"
            size={26}
          />
        )}
      </View>
      <View style={styles.profileCopy}>
        <Text numberOfLines={1} style={styles.profileName}>
          {name}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.profileMeta}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const SettingsAppSummary = ({Logo, logoSource, name, subtitle}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.appSummary}>
      <View style={styles.appLogo}>
        {logoSource ? (
          <Image source={logoSource} style={styles.appLogoImage} />
        ) : Logo ? (
          <Logo height={30} width={30} />
        ) : null}
      </View>
      <View style={styles.appSummaryCopy}>
        <Text style={styles.appSummaryName}>{name}</Text>
        <Text style={styles.appSummaryMeta}>{subtitle}</Text>
      </View>
    </View>
  );
};

export const SettingsNotice = ({
  body,
  danger = false,
  icon = 'information-outline',
  title,
}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <View style={[styles.notice, danger && styles.dangerNotice]}>
      <MaterialCommunityIcons
        color={danger ? theme.colors.danger : theme.colors.textSecondary}
        name={icon}
        size={20}
      />
      <View style={styles.noticeCopy}>
        {title ? <Text style={styles.noticeTitle}>{title}</Text> : null}
        <Text style={styles.noticeBody}>{body}</Text>
      </View>
    </View>
  );
};

export const SettingsActionFooter = ({
  busy = false,
  busyLabel,
  primaryDisabled = false,
  primaryLabel,
  primaryOnPress,
  primaryTestID,
  primaryVariant = 'primary',
  secondaryDisabled = false,
  secondaryLabel,
  secondaryOnPress,
}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <SafeBottomActionStack
      bottomSpacing={12}
      gap={10}
      horizontalSpacing={22}
      safeAreaSpacing={12}
      style={styles.footer}>
      {busy ? (
        <View style={{alignItems: 'center'}}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          {busyLabel ? <Text style={styles.loadingText}>{busyLabel}</Text> : null}
        </View>
      ) : (
        <View style={styles.footerRow}>
          {secondaryLabel ? (
            <AppButton
              disabled={secondaryDisabled}
              height={52}
              onPress={secondaryOnPress}
              style={styles.footerButton}
              variant="secondary">
              {secondaryLabel}
            </AppButton>
          ) : null}
          <AppButton
            disabled={primaryDisabled}
            height={52}
            onPress={primaryOnPress}
            style={styles.footerPrimaryButton}
            testID={primaryTestID}
            variant={primaryVariant}>
            {primaryLabel}
          </AppButton>
        </View>
      )}
    </SafeBottomActionStack>
  );
};

export const SettingsLoadingState = ({label}) => {
  const theme = useOnboardingTheme();
  const styles = getStyles(theme);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        {label ? <Text style={styles.loadingText}>{label}</Text> : null}
      </View>
    </SafeAreaView>
  );
};
