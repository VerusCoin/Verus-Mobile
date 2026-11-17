import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScrollEdgeFade from './ScrollEdgeFade';
import {deepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const SCROLL_END_THRESHOLD = 8;
const MIN_FADE_VIEWPORT_HEIGHT = 128;

export const SheetScrollCue = ({
  styles,
  theme,
  backgroundColor = theme.colors.sheet,
}) => (
  <View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={styles.requestSheetScrollCue}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient
          id="requestSheetBottomScrollCue"
          x1="0"
          x2="0"
          y1="0"
          y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.5" stopColor={backgroundColor} stopOpacity="1" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect
        width="100%"
        height="100%"
        fill="url(#requestSheetBottomScrollCue)"
      />
    </Svg>
    {/* The opaque strip keeps scrolling text out of the chevron's line. */}
    <View style={[styles.requestSheetScrollCueChevron, {backgroundColor}]}>
      <MaterialCommunityIcons
        name="chevron-down"
        size={15}
        color={theme.colors.textSubtle}
      />
    </View>
  </View>
);

// The scroll view unmounts with the sheet after closing, retaining its position
// and cue through the exit animation and starting fresh on the next opening.
const SheetScrollView = ({
  children,
  contentContainerStyle,
  fill = false,
  fadeBackgroundColor,
  showScrollChevron = true,
  listProps,
  scrollViewProps,
  style,
}) => {
  const ScrollComponent = listProps ? FlatList : ScrollView;
  const theme = useOnboardingTheme();
  const styles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  const [metrics, setMetrics] = useState({
    contentHeight: 0,
    layoutHeight: 0,
    offsetY: 0,
  });
  const update = useCallback(
    values =>
      setMetrics(current => {
        const next = {...current, ...values};
        return Object.keys(next).every(key => next[key] === current[key])
          ? current
          : next;
      }),
    [],
  );
  const showNativeIndicator =
    scrollViewProps?.showsVerticalScrollIndicator ||
    metrics.layoutHeight < MIN_FADE_VIEWPORT_HEIGHT;
  const contentStyle = StyleSheet.flatten([styles.requestSheetContent, contentContainerStyle]) || {};
  const bottomPadding = contentStyle.paddingBottom ?? contentStyle.paddingVertical ?? contentStyle.padding ?? 0;
  const contentEnd = metrics.contentHeight - bottomPadding;
  const showCue =
    (!showNativeIndicator || !showScrollChevron) &&
    metrics.contentHeight > metrics.layoutHeight + SCROLL_END_THRESHOLD &&
    metrics.offsetY + metrics.layoutHeight <
      contentEnd - SCROLL_END_THRESHOLD;

  return (
    <View style={[styles.requestSheetScrollFrame, fill && {flexGrow: 1}, style]}>
      <ScrollComponent
        {...scrollViewProps}
        {...listProps}
        alwaysBounceVertical={false}
        bounces={false}
        style={styles.requestSheetScroll}
        contentContainerStyle={[
          styles.requestSheetContent,
          contentContainerStyle,
        ]}
        keyboardDismissMode={scrollViewProps?.keyboardDismissMode || 'on-drag'}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(contentWidth, contentHeight) => {
          update({contentHeight});
          scrollViewProps?.onContentSizeChange?.(contentWidth, contentHeight);
        }}
        onLayout={event => {
          update({layoutHeight: event.nativeEvent.layout.height});
          scrollViewProps?.onLayout?.(event);
        }}
        onScroll={({
          nativeEvent: {contentOffset, contentSize, layoutMeasurement},
        }) =>
          update({
            contentHeight: contentSize.height,
            layoutHeight: layoutMeasurement.height,
            offsetY: contentOffset.y,
          })
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={showNativeIndicator}>
        {listProps ? undefined : children}
      </ScrollComponent>
      {showCue ? (showScrollChevron
        ? <SheetScrollCue styles={styles} theme={theme} backgroundColor={fadeBackgroundColor} />
        : <ScrollEdgeFade backgroundColor={fadeBackgroundColor} />) : null}
    </View>
  );
};

export default SheetScrollView;
