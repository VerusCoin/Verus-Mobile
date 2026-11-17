import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useHeaderHeight} from '@react-navigation/elements';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import KeyboardAvoidingForm from '../../../components/KeyboardAvoidingForm';
import AppButton from '../../../components/AppButton';
import SlideToConfirm from '../../../components/SlideToConfirm';
import CopyFeedback from '../../../components/CopyFeedback';
import useCopyFeedback from '../../../hooks/useCopyFeedback';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {SheetScrollCue} from '../../../components/SheetScrollView';
import {deepLinkRequestReviewStyles} from '../../../styles';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

export const WIZARD_CONTENT_INSET = 16;
export const WIZARD_CONTENT_TOP_INSET = 24;

// The stack header is outside this view. Keyboard coordinates include it.
//
// `pinned` sits above the action, outside the scroll area, so a result the user
// must see before continuing is never below the fold on a short screen.
export const WizardFormLayout = ({
  children,
  contentContainerStyle,
  error,
  pinned,
  ...footerProps
}) => {
  const headerHeight = useHeaderHeight();
  const theme = useOnboardingTheme();
  const cueStyles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  const {keyboardVisible, smallDeviceKeyboardVisible} =
    useOnboardingSmallDeviceLayout();
  const [footerHeight, setFooterHeight] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({
    content: 0,
    viewport: 0,
    offset: 0,
  });
  const scrollRef = useRef(null);
  const fieldLayoutRef = useRef(null);
  const errorLayoutRef = useRef(null);
  const recoveryLayoutRef = useRef(null);
  const viewportHeightRef = useRef(0);
  const revealFrameRef = useRef(null);
  // A fade over a short form can hide the error it just scrolled into view.
  const showNativeIndicator = Boolean(error) || scrollMetrics.viewport < 128;

  const revealError = useCallback(() => {
    if (revealFrameRef.current != null) {
      cancelAnimationFrame(revealFrameRef.current);
    }
    if (!error) return;

    // Wait for content and keyboard/footer layout to settle. Compact Amount
    // includes Available/MAX so the user can correct the error without a swipe.
    revealFrameRef.current = requestAnimationFrame(() => {
      revealFrameRef.current = null;
      const layout = errorLayoutRef.current;
      const recovery = smallDeviceKeyboardVisible && recoveryLayoutRef.current;
      const viewportHeight = viewportHeightRef.current;
      if (!layout || viewportHeight <= 0) return;
      const bottom = Math.max(
        layout.y + layout.height,
        recovery ? recovery.y + recovery.height : 0,
      );

      // Never auto-scroll the field under the context band to reveal a
      // message. Longer content remains reachable by scrolling.
      scrollRef.current?.scrollTo({
        y: Math.min(
          Math.max(0, fieldLayoutRef.current?.y || 0),
          Math.max(0, bottom - viewportHeight),
        ),
        animated: false,
      });
    });
  }, [error, smallDeviceKeyboardVisible]);

  useEffect(() => {
    revealError();
    return () => {
      if (revealFrameRef.current != null) {
        cancelAnimationFrame(revealFrameRef.current);
      }
    };
  }, [keyboardVisible, revealError]);

  // Render this slot directly in the ScrollView, immediately after the field.
  // Its onLayout coordinates must share the scroll content's origin.
  const errorMessage = error ? (
    <View
      onLayout={event => {
        errorLayoutRef.current = event.nativeEvent.layout;
        revealError();
      }}>
      <ErrorMessage
        style={[
          styles.formError,
          smallDeviceKeyboardVisible && styles.formErrorCompact,
        ]}>
        {error}
      </ErrorMessage>
    </View>
  ) : null;

  const content = (
    <>
      <View style={styles.formScrollFrame}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, height) => {
            setScrollMetrics(current => ({...current, content: height}));
            revealError();
          }}
          onLayout={event => {
            const height = event.nativeEvent.layout.height;
            viewportHeightRef.current = height;
            setScrollMetrics(current => ({...current, viewport: height}));
            revealError();
          }}
          onScroll={event => {
            const offset = event.nativeEvent.contentOffset.y;
            setScrollMetrics(current => ({...current, offset}));
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={showNativeIndicator}
          style={styles.screen}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            // Keep a footer-sized scroll reserve when the keyboard contracts
            // the form. Apply it after caller padding so tail controls can clear
            // Continue even on compact Android screens.
            keyboardVisible && {paddingBottom: footerHeight + 24},
          ]}>
          {children(
            errorMessage,
            event => {
              fieldLayoutRef.current = event.nativeEvent.layout;
              revealError();
            },
            event => {
              recoveryLayoutRef.current = event.nativeEvent.layout;
              revealError();
            },
          )}
        </ScrollView>
        {!showNativeIndicator &&
        scrollMetrics.content > scrollMetrics.viewport + 8 &&
        scrollMetrics.offset + scrollMetrics.viewport < scrollMetrics.content - 8 ? (
          <SheetScrollCue
            backgroundColor={theme.colors.background}
            styles={cueStyles}
            theme={theme}
          />
        ) : null}
      </View>
      <View style={styles.formFooter}>
        {pinned ? <View style={styles.formPinned}>{pinned}</View> : null}
        <View
          onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}>
          <WizardFooter
            {...footerProps}
            bottomSpacing={keyboardVisible ? 8 : 24}
            includeBottomInset={!keyboardVisible}
            safeAreaSpacing={keyboardVisible ? 0 : 12}
          />
        </View>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingForm
      keyboardVerticalOffset={headerHeight}
      style={styles.screen}>
      {content}
    </KeyboardAvoidingForm>
  );
};

export const WizardScreen = ({children, contentContainerStyle, scroll = true}) => {
  const theme = useOnboardingTheme();

  if (!scroll) {
    return (
      <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={[styles.screen, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
      {children}
    </ScrollView>
  );
};

export const WizardSearch = ({onChangeText, placeholder, value}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={[styles.search, {backgroundColor: theme.colors.input}]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        returnKeyType="search"
        style={[styles.searchInput, {color: theme.colors.textPrimary}]}
        value={value}
      />
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={theme.colors.textSubtle}
      />
    </View>
  );
};

export const WizardSectionLabel = ({children}) => {
  const theme = useOnboardingTheme();
  return (
    <Text style={[theme.typography.labelCaps, styles.sectionLabel, {color: theme.colors.textSecondary}]}>
      {children}
    </Text>
  );
};

export const AssetOptionRow = ({
  coinId,
  detail,
  name,
  onPress,
  right,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.assetRow, pressed && styles.pressed]}>
      <View style={styles.assetLogo}>
        <AssetCoinLogo coinId={coinId} size={38} />
      </View>
      <View style={styles.assetRowCopy}>
        <Text
          numberOfLines={1}
          style={[styles.assetRowTitle, {color: theme.colors.textPrimary}]}>
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.assetRowDetail, {color: theme.colors.textSecondary}]}>
          {detail || ticker}
        </Text>
      </View>
      {right || (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      )}
    </Pressable>
  );
};

export const InfoCard = ({children, style}) => {
  const theme = useOnboardingTheme();
  return (
    <View
      style={[
        styles.infoCard,
        {backgroundColor: theme.colors.surfaceMuted},
        style,
      ]}>
      {children}
    </View>
  );
};

export const DetailRow = ({label, value}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.detailValue, {color: theme.colors.textPrimary}]}>
        {value}
      </Text>
    </View>
  );
};

// One label/value row of a flat list. The list container draws the top
// hairline; each row draws its own bottom one. Pass `onPress` for a row that
// opens a sheet, and `children` for a value that is not plain text. Pass
// `numberOfLines={0}` where the whole value must stay readable, as for
// addresses and fees. `copyValue` enables long-press copy of the exact value.
// A row pinned above the footer action passes `divider={false}`; `strong`
// gives its label the row-title weight.
export const FlatRow = ({
  accessibilityLabel,
  children,
  copyValue,
  divider = true,
  label,
  numberOfLines = 2,
  onPress,
  quiet = false,
  strong = false,
  value,
  valueStyle,
}) => {
  const theme = useOnboardingTheme();
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {haptic: true});
  const content = (
    <>
      <Text
        style={
          strong
            ? [theme.typography.titleRow, styles.flatLabelStrong, {color: theme.colors.textPrimary}]
            : [styles.flatLabel, {color: theme.colors.textSecondary}]
        }>
        {label}
      </Text>
      <View style={styles.flatValueWrap}>
        <CopyFeedback copied={copied} style={styles.flatCopyValue}>
          <View style={styles.flatValueContent}>
            {children || (
              <Text
                numberOfLines={numberOfLines}
                style={[
                  styles.flatValue,
                  {
                    color: quiet
                      ? theme.colors.textSecondary
                      : theme.colors.textPrimary,
                  },
                  quiet && styles.flatValueQuiet,
                  valueStyle,
                ]}>
                {value}
              </Text>
            )}
          </View>
        </CopyFeedback>
        {onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSubtle}
            style={styles.flatChevron}
          />
        ) : null}
      </View>
    </>
  );
  const rowStyle = [
    styles.flatRow,
    {borderBottomColor: theme.colors.border},
    !divider && styles.flatRowNoDivider,
  ];

  return canCopy ? (
    <Pressable
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      {...copyProps}
      onPress={onPress}
      style={({pressed}) => [rowStyle, onPress && pressed && {opacity: 0.74}]}>
      {content}
    </Pressable>
  ) : onPress ? (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.74}
      onPress={onPress}
      style={rowStyle}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
};

export const ErrorMessage = ({children, style}) => {
  const theme = useOnboardingTheme();
  if (!children) return null;
  return (
    <View style={[styles.errorBox, {backgroundColor: theme.colors.surfaceMuted}, style]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={16}
        color={theme.colors.danger}
      />
      <Text style={[theme.typography.caption, styles.errorText, {color: theme.colors.danger}]}>
        {children}
      </Text>
    </View>
  );
};

// `above` sits over the action in the same safe stack, outside any scroll area.
export const WizardFooter = ({
  above,
  children = 'Continue',
  disabled,
  bottomSpacing = 24,
  slideToConfirm = false,
  horizontalSpacing = 16,
  includeBottomInset = true,
  loading,
  loadingText = 'Please wait…',
  onPress,
  safeAreaSpacing = 12,
}) => {
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const buttonLabel = loading ? loadingText : children;
  return (
    <SafeBottomActionStack
      horizontalSpacing={horizontalSpacing}
      bottomSpacing={bottomSpacing}
      includeBottomInset={includeBottomInset}
      safeAreaSpacing={safeAreaSpacing}
      style={[styles.footer, smallDevice && styles.footerCompact]}>
      {above}
      {slideToConfirm ? (
        <SlideToConfirm
          disabled={disabled}
          loading={loading}
          loadingText={loadingText}
          label={children}
          onPress={onPress}
        />
      ) : (
        <AppButton disabled={disabled || loading} onPress={onPress}>
          {buttonLabel}
        </AppButton>
      )}
    </SafeBottomActionStack>
  );
};

export const wizardTextStyles = StyleSheet.create({
  title: {
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('bold'),
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
});

const styles = StyleSheet.create({
  footer: {paddingTop: 16},
  footerCompact: {paddingTop: 8},
  formFooter: {flexShrink: 0},
  formScrollFrame: {flex: 1, minHeight: 0, overflow: 'hidden'},
  formPinned: {paddingHorizontal: WIZARD_CONTENT_INSET},
  screen: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 24},
  formError: {marginHorizontal: 0, marginVertical: 8},
  formErrorCompact: {paddingVertical: 6, paddingHorizontal: 10},
  search: {
    height: 52,
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 52,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  sectionLabel: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    marginTop: 18,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  assetRow: {
    minHeight: 70,
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {opacity: 0.7},
  assetLogo: {width: 38, height: 38, marginRight: 16},
  assetRowCopy: {flex: 1, minWidth: 0},
  assetRowTitle: {fontSize: 17, lineHeight: 22, ...fontStyle('semiBold')},
  assetRowDetail: {fontSize: 14, lineHeight: 19, marginTop: 3, ...fontStyle('regular')},
  infoCard: {borderRadius: 16, padding: 16},
  detailRow: {
    minHeight: 42,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {fontSize: 14, lineHeight: 20, marginRight: 16, ...fontStyle('regular')},
  detailValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    ...fontStyle('semiBold'),
  },
  flatRow: {
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flatRowNoDivider: {borderBottomWidth: 0},
  flatLabel: {fontSize: 14, lineHeight: 19, marginRight: 16, ...fontStyle('regular')},
  flatLabelStrong: {marginRight: 16},
  flatValueWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  flatCopyValue: {flex: 1, minWidth: 0},
  flatValueContent: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  flatValue: {flexShrink: 1, textAlign: 'right', fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
  flatValueQuiet: {...fontStyle('regular')},
  flatChevron: {marginLeft: 2},
  errorBox: {
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginVertical: 12,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {flex: 1, marginLeft: 6},
});
