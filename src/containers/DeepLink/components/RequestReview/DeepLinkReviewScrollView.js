import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import useReduceMotion from '../../../../hooks/useReduceMotion';
import useBottomSheetActivity, {isBottomSheetActive} from '../../../../hooks/useBottomSheetActivity';
import {RequestSheetScrollCue} from './DeepLinkRequestSheetScaffold';
import {deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const SCROLL_THRESHOLD = 48;

const DeepLinkReviewScrollView = forwardRef(({
  children,
  contentContainerStyle,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  onLayout,
  onContentSizeChange,
  style,
  showScrollCue = false,
  requestCard = false,
}, ref) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [tailSpace, setTailSpace] = useState(0);
  const scrollRef = useRef(null);
  const targetRef = useRef(null);
  const frameRef = useRef(null);
  const offsetRef = useRef(0);
  const tailLayoutPending = useRef(false);
  const reduceMotion = useReduceMotion();
  const sheetActive = useBottomSheetActivity();
  const revealTarget = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const request = targetRef.current;
      const target = request?.itemRef.current;
      // The anchor (for example a notice above the item) goes to the top inset.
      const anchor = request?.anchorRef?.current || target;
      if (isBottomSheetActive() || tailLayoutPending.current || !contentHeight || !target || !scrollRef.current) return;
      scrollRef.current.measureInWindow((_x, viewportY, _width, height) => {
        target.measureInWindow((_left, top, _targetWidth, targetHeight) => {
          if (isBottomSheetActive() || request !== targetRef.current || !height) return;
          const visibleBottom = viewportY + height - (showScrollCue ? 46 : 0);
          // A target is revealed once; a later sheet close or resize must not jump the page.
          if (top >= viewportY && top + targetHeight <= visibleBottom) {
            targetRef.current = null;
            return;
          }
          anchor.measureInWindow((_anchorLeft, anchorTop) => {
            if (request !== targetRef.current) return;
            const y = Math.max(0, offsetRef.current + anchorTop - viewportY - 16);
            // The last open item must also be able to reach the top inset.
            const neededSpace = Math.max(0, y + height - (contentHeight - tailSpace));
            if (Math.abs(neededSpace - tailSpace) > 1) {
              tailLayoutPending.current = true;
              setTailSpace(neededSpace);
              return; // Measure again after the extra space has laid out.
            }
            targetRef.current = null;
            scrollRef.current?.scrollTo({y, animated: !reduceMotion});
          });
        });
      });
    });
  }, [contentHeight, reduceMotion, showScrollCue, tailSpace]);
  useImperativeHandle(ref, () => ({
    scrollToEnd: options => scrollRef.current?.scrollToEnd(options),
    scrollIntoView: (itemRef, anchorRef) => {
      targetRef.current = itemRef ? {itemRef, anchorRef} : null;
      if (!itemRef?.current) setTailSpace(0);
      revealTarget();
    },
  }), [revealTarget]);
  useEffect(() => {
    revealTarget();
    return () => cancelAnimationFrame(frameRef.current);
  }, [revealTarget, sheetActive, viewportHeight]);
  const scrollEnabled =
    viewportHeight > 0 &&
    contentHeight > viewportHeight + (showScrollCue ? 8 : SCROLL_THRESHOLD);
  const contentStyle = StyleSheet.flatten([styles.scrollContent, contentContainerStyle]);
  const bottomPadding = contentStyle?.paddingBottom ?? contentStyle?.paddingVertical ?? contentStyle?.padding ?? 0;
  // Footer clearance and the approval alignment spacer are not unseen content.
  const contentEnd = contentHeight - tailSpace - bottomPadding;
  const showBottomCue =
    showScrollCue &&
    scrollEnabled &&
    offsetY + viewportHeight < contentEnd - 8;

  const content = (
    <ScrollView
      ref={scrollRef}
      alwaysBounceVertical={false}
      bounces={false}
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle,
        requestCard && {paddingTop: 0},
      ]}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onContentSizeChange={(width, height) => {
        tailLayoutPending.current = false;
        setContentHeight(height);
        onContentSizeChange?.(width, height);
      }}
      onLayout={event => {
        setViewportHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
      }}
      onScroll={event => {
        offsetRef.current = event.nativeEvent.contentOffset.y;
        setOffsetY(offsetRef.current);
      }}
      scrollEventThrottle={16}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      style={[styles.scrollView, style]}>
      {children}
      {tailSpace > 0 && <View style={{height: tailSpace}} />}
    </ScrollView>
  );
  if (!showScrollCue && !requestCard) return content;
  return (
    <View style={[styles.scrollView, requestCard && {paddingTop: 48}]}>
      {content}
      {showBottomCue && (
        <RequestSheetScrollCue
          styles={styles}
          theme={theme}
          backgroundColor={theme.colors.background}
        />
      )}
    </View>
  );
});

export default DeepLinkReviewScrollView;
