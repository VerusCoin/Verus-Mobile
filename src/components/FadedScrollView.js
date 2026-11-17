import React, {forwardRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import ScrollEdgeFade from './ScrollEdgeFade';

const FadedScrollView = forwardRef(function FadedScrollView(
  {
    children,
    contentContainerStyle,
    containerStyle,
    fadeBackgroundColor,
    fadeLength = 36,
    horizontal = false,
    onContentSizeChange,
    onLayout,
    onScroll,
    scrollEventThrottle = 16,
    showEndFade = true,
    showStartFade,
    ...scrollViewProps
  },
  ref,
) {
  const [metrics, setMetrics] = useState({
    contentLength: 0,
    layoutLength: 0,
    offset: 0,
  });
  const contentStyle = StyleSheet.flatten(contentContainerStyle) || {};
  const endPadding = horizontal ? 0 :
    contentStyle.paddingBottom ?? contentStyle.paddingVertical ?? contentStyle.padding ?? 0;
  // Clearance is not unseen content. Hide the fade as soon as the last real
  // row is visible, including after the viewport or content shrinks.
  const contentEnd = metrics.contentLength - endPadding;
  const canOverflow = metrics.contentLength > metrics.layoutLength + 1;
  const startFadeEnabled =
    showStartFade == null ? horizontal : showStartFade;
  const startFadeVisible =
    startFadeEnabled && canOverflow && metrics.offset > 2;
  const endFadeVisible =
    showEndFade &&
    canOverflow &&
    metrics.offset + metrics.layoutLength < contentEnd - 2;

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        {...scrollViewProps}
        contentContainerStyle={contentContainerStyle}
        horizontal={horizontal}
        onContentSizeChange={(contentWidth, contentHeight) => {
          setMetrics(current => ({
            ...current,
            contentLength: horizontal ? contentWidth : contentHeight,
          }));
          onContentSizeChange?.(contentWidth, contentHeight);
        }}
        onLayout={event => {
          const {height, width} = event.nativeEvent.layout;
          setMetrics(current => ({
            ...current,
            layoutLength: horizontal ? width : height,
          }));
          onLayout?.(event);
        }}
        onScroll={event => {
          const {x, y} = event.nativeEvent.contentOffset;
          setMetrics(current => ({
            ...current,
            offset: Math.max(0, horizontal ? x : y),
          }));
          onScroll?.(event);
        }}
        ref={ref}
        scrollEventThrottle={scrollEventThrottle}>
        {children}
      </ScrollView>
      {startFadeEnabled ? (
        <ScrollEdgeFade
          backgroundColor={fadeBackgroundColor}
          edge={horizontal ? 'left' : 'top'}
          length={fadeLength}
          visible={startFadeVisible}
        />
      ) : null}
      <ScrollEdgeFade
        backgroundColor={fadeBackgroundColor}
        edge={horizontal ? 'right' : 'bottom'}
        length={fadeLength}
        visible={endFadeVisible}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});

export default FadedScrollView;
