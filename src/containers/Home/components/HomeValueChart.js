import PropTypes from 'prop-types';
import React, {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import {
  AccessibilityInfo, Animated, Easing, Text, useWindowDimensions, View,
  TouchableOpacity,
} from 'react-native';
import { PanGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Svg, {
  Circle, Defs, G, Line, LinearGradient, Path, Stop,
} from 'react-native-svg';

import { useOnboardingTheme } from '../../../theme/onboarding';
import { homeValueChartStyles as styles } from '../../../styles';
import SkeletonLoader, { SkeletonBlock } from '../../../components/SkeletonLoader';
import { ONBOARDING_SMALL_DEVICE_MAX_HEIGHT } from '../../../hooks/useOnboardingSmallDeviceLayout';
import { triggerHaptic, triggerLightHaptic } from '../../../utils/haptics/haptics';
import {
  areaBetween, change, dateText, geometry, label, lineBetween, percentNumber, RANGE_LABELS, spanText,
} from '../../../utils/portfolioHistory/chartMath';

// Room around the plot so the end dot and the scrub ring are not cut at the chart edge.
// Native SVG clips to its own bounds, so the canvas is wider than the plot.
const EDGE = 8;

const HomeValueChart = ({
  history, panRef, showBalance, formatValue, onScrub, expanded, preferenceHydrated, onToggle,
}) => {
  const theme = useOnboardingTheme();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const stripHeight = compact ? 44 : 48;
  const openHeight = compact ? 108 : 124;
  const rangeHeight = compact ? 40 : 44;
  const expansion = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const initialized = useRef(false);
  const [animatedExpansion, setAnimatedExpansion] = useState(null);
  const progress = animatedExpansion ?? (expanded ? 1 : 0);
  const height = stripHeight + ((openHeight - stripHeight) * progress);
  const top = 8 + (20 * progress);
  const bottom = 8 + (24 * progress);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(null);
  const [accessibleIndex, setAccessibleIndex] = useState(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const [sinceWidth, setSinceWidth] = useState(0);
  const active = useRef(false);
  const pointIndex = useRef(null);
  const lastTick = useRef(0);
  const reduceMotion = useRef(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const id = useId().replace(/:/g, '');
  const {
    series, now, range, record, loading,
  } = history;
  const plotWidth = Math.max(0, width - (54 * (1 - progress)));
  const rangeWidth = history.ranges.length ? 44 + ((history.ranges.length - 1)
    * (width - 38) / history.ranges.length) : 0;
  const geo = useMemo(() => (series && plotWidth > 0
    ? geometry(series.points, plotWidth, height, series.axisStart, top, bottom) : null),
  [series, plotWidth, height, top, bottom]);
  const percent = series ? change(series.points) : null;
  const span = series ? spanText(range, series.partial, record.start, now) : '';
  const since = series && (series.partial || range === 'All') ? `Since ${dateText(record.start, now)}` : null;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) reduceMotion.current = value; }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { reduceMotion.current = value; });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const listener = expansion.addListener(({ value }) => setAnimatedExpansion(value));
    return () => expansion.removeListener(listener);
  }, [expansion]);

  useEffect(() => {
    if (!preferenceHydrated) return undefined;
    expansion.stopAnimation();
    const toValue = expanded ? 1 : 0;
    if (!initialized.current || reduceMotion.current) {
      expansion.setValue(toValue);
      initialized.current = true;
      return undefined;
    }
    const animation = Animated.timing(expansion, {
      toValue, duration: 240, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, preferenceHydrated, expansion]);

  const release = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    pointIndex.current = null;
    setIndex(null);
    onScrub(null);
  }, [onScrub]);
  useEffect(() => () => { onScrub(null); }, [onScrub]);
  useEffect(() => { release(); setAccessibleIndex(null); }, [range, loading, history.state, expanded, release]);
  useEffect(() => { if (history.focused === false) release(); }, [history.focused, release]);

  const selectPoint = (x) => {
    if (!geo || loading) return;
    let nearest = 0;
    geo.points.forEach((p, i) => {
      if (Math.abs(p[0] - x) < Math.abs(geo.points[nearest][0] - x)) nearest = i;
    });
    if (nearest === pointIndex.current) return;
    pointIndex.current = nearest;
    setIndex(nearest);
    onScrub(series.points[nearest]);
    const time = Date.now();
    if (time - lastTick.current >= 50) {
      triggerHaptic('selection');
      lastTick.current = time;
    }
  };
  const selectRange = (next) => {
    if (next === range) return;
    release();
    triggerHaptic('selection');
    opacity.stopAnimation();
    opacity.setValue(reduceMotion.current ? 1 : 0);
    history.setRange(next);
    if (!reduceMotion.current) {
      Animated.timing(opacity,
        { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  };

  if (history.state === 'none') return null;
  if (history.state === 'day1') {
    return (
      <Text style={[theme.typography.caption, styles.day1, { color: theme.colors.textSecondary }]}>
        The chart appears after 24 hours.
      </Text>
    );
  }

  const selectedIndex = index != null && index < series.points.length ? index : null;
  const scrubPoint = selectedIndex == null ? null : series.points[selectedIndex];
  const marker = geo?.points[selectedIndex ?? (geo.points.length - 1)];
  const scrubLabel = scrubPoint ? label(scrubPoint, now) : '';
  const accessiblePoint = accessibleIndex == null ? null : series.points[accessibleIndex];
  const restValue = [RANGE_LABELS[range], percent == null ? null
    : `${percent >= 0 ? 'up' : 'down'} ${percentNumber(percent)} percent`,
  since ? span : null].filter(Boolean).join(', ');
  const accessibleValue = accessiblePoint ? `${label(accessiblePoint, now)}${showBalance
    ? `, ${formatValue(accessiblePoint.v)}` : ''}` : restValue;
  const adjust = (event) => {
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    setAccessibleIndex(Math.max(0, Math.min(series.points.length - 1,
      (accessibleIndex ?? (series.points.length - 1)) + direction)));
  };
  // Two separate paths instead of a moving clip: Android does not redraw a changed ClipPath.
  const last = geo ? geo.points.length - 1 : 0;
  const layer = (from, to, dim) => (
    <>
      <Path d={areaBetween(geo.points, geo.segs, from, to, height)} fill={`url(#${id}fill)`} opacity={dim} />
      <Path
        d={lineBetween(geo.points, geo.segs, from, to)}
        fill="none"
        opacity={dim}
        stroke={theme.colors.chartLine}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );

  return (
    <View style={styles.block}>
      <View style={styles.plot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <TapGestureHandler
          enabled={!expanded}
          waitFor={panRef}
          maxDist={8}
          maxDeltaX={8}
          maxDeltaY={8}
          // Movement decides tap versus scrub, with no long-press deadline.
          maxDurationMs={2147483647}
          onHandlerStateChange={(event) => {
            if (!expanded && event.nativeEvent.state === State.END) onToggle();
          }}
        >
          <View style={{ width: plotWidth, height }}>
            {loading ? (
              <SkeletonLoader accessibilityLabel="Loading value history" style={[styles.skeleton, { height, paddingTop: top }]}>
                <SkeletonBlock height={height - top - 8} />
              </SkeletonLoader>
            ) : (
              <PanGestureHandler
                ref={panRef}
                activeOffsetX={[-8, 8]}
                failOffsetY={[-8, 8]}
                maxPointers={1}
                onGestureEvent={(event) => { if (active.current) selectPoint(event.nativeEvent.x); }}
                onHandlerStateChange={(event) => {
                  if (event.nativeEvent.state === State.ACTIVE) {
                    active.current = true;
                    triggerLightHaptic();
                    selectPoint(event.nativeEvent.x);
                  } else if ([State.END, State.CANCELLED, State.FAILED].includes(event.nativeEvent.state)) release();
                }}
              >
                <View
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel="Value"
                  accessibilityValue={{ text: accessibleValue }}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={adjust}
                  style={{ height }}
                >
                  {geo && (
                    <Animated.View pointerEvents="none" style={{ opacity, marginLeft: -EDGE }}>
                      <Svg width={plotWidth + (2 * EDGE)} height={height} accessible={false}>
                        <Defs>
                          <LinearGradient id={`${id}fill`} gradientUnits="userSpaceOnUse" x1={0} y1={geo.top} x2={0} y2={height}>
                            <Stop offset="0" stopColor={theme.colors.chartLine} stopOpacity={theme.isDark ? 0.24 : 0.18} />
                            <Stop offset="1" stopColor={theme.colors.chartLine} stopOpacity={0} />
                          </LinearGradient>
                        </Defs>
                        <G x={EDGE}>
                          {index != null && (
                          <Line
                            x1={marker[0]}
                            x2={marker[0]}
                            y1={top - 4}
                            y2={height}
                            stroke={theme.colors.chartLine}
                            strokeWidth={1}
                          />
                          )}
                          {selectedIndex == null ? layer(0, last, 1) : (
                            <>
                              {layer(0, selectedIndex, 1)}
                              {selectedIndex < last && layer(selectedIndex, last, theme.isDark ? 0.5 : 0.30)}
                            </>
                          )}
                          <Circle
                            cx={marker[0]}
                            cy={marker[1]}
                            r={index == null ? 4 : 5.5}
                            fill={theme.colors.chartLine}
                            stroke={theme.colors.background}
                            strokeWidth={index == null ? 0 : 2.5}
                          />
                        </G>
                      </Svg>
                    </Animated.View>
                  )}
                  {expanded && scrubPoint && marker && (
                  <Text
                    accessible={false}
                    numberOfLines={1}
                    onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
                    style={[theme.typography.labelSm, styles.label, styles.tabular,
                      {
                        color: theme.colors.textSecondary,
                        left: 0,
                        transform: [{
                          translateX: Math.max(0, Math.min(plotWidth - labelWidth, marker[0] - (labelWidth / 2))),
                        }],
                      }]}
                  >
                    {scrubLabel}
                  </Text>
                  )}
                  {expanded && !scrubPoint && since && geo && (
                  <Text
                    accessible={false}
                    numberOfLines={1}
                    onLayout={(event) => setSinceWidth(event.nativeEvent.layout.width)}
                    style={[theme.typography.caption, styles.label,
                      {
                        color: theme.colors.textSecondary,
                        left: 0,
                        transform: [{ translateX: Math.max(0, Math.min(plotWidth - sinceWidth, geo.points[0][0])) }],
                      }]}
                  >
                    {since}
                  </Text>
                  )}
                </View>
              </PanGestureHandler>
            )}
          </View>
        </TapGestureHandler>
        <View
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
          style={[styles.ranges, { width: rangeWidth, height: rangeHeight * progress, opacity: progress }]}
        >
          {/* Leave the tabs out while fully closed, so screen readers cannot reach hidden tabs. */}
          {progress > 0 && history.ranges.map((item) => (
            <TouchableOpacity
              key={item}
              accessibilityRole="tab"
              accessibilityLabel={RANGE_LABELS[item]}
              accessibilityState={{ selected: range === item }}
              hitSlop={{ top: compact ? 4 : 2, bottom: compact ? 4 : 2 }}
              onPress={() => selectRange(item)}
              style={[styles.range, { height: compact ? 40 : 44 }]}
            >
              <Text style={[theme.typography.labelSm, range === item && styles.selected,
                { color: range === item ? theme.colors.chartLine : theme.colors.chartRange }]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={`Chart range, ${RANGE_LABELS[range]}`}
          accessibilityState={{ expanded }}
          accessibilityHint={expanded ? 'Close chart' : 'Open chart'}
          hitSlop={{ top: compact && expanded ? 4 : 0, bottom: compact && expanded ? 4 : 0 }}
          onPress={onToggle}
          style={[styles.toggle, {
            top: (((stripHeight - 44) / 2) * (1 - progress)) + (openHeight * progress),
            height: expanded ? rangeHeight : 44,
          }]}
        >
          {!expanded && (
            <Text
              style={[theme.typography.labelSm, styles.selected, styles.tabular, { color: theme.colors.chartLine }]}
            >
              {range}
            </Text>
          )}
          {expanded ? <ChevronUp size={16} color={theme.colors.chartRange} />
            : <ChevronDown size={16} color={theme.colors.chartRange} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const homeValueChartHistoryPropType = PropTypes.shape({
  hydrated: PropTypes.bool.isRequired,
  focused: PropTypes.bool,
  state: PropTypes.oneOf(['none', 'day1', 'chart']).isRequired,
  loading: PropTypes.bool.isRequired,
  now: PropTypes.number.isRequired,
  range: PropTypes.string.isRequired,
  ranges: PropTypes.arrayOf(PropTypes.string).isRequired,
  setRange: PropTypes.func.isRequired,
  record: PropTypes.shape({ start: PropTypes.number }),
  series: PropTypes.shape({
    points: PropTypes.arrayOf(PropTypes.shape({
      t: PropTypes.number,
      v: PropTypes.number,
      kind: PropTypes.string,
    })).isRequired,
    axisStart: PropTypes.number.isRequired,
    partial: PropTypes.bool.isRequired,
  }),
});
HomeValueChart.propTypes = {
  history: homeValueChartHistoryPropType.isRequired,
  panRef: PropTypes.shape({}).isRequired,
  showBalance: PropTypes.bool.isRequired,
  formatValue: PropTypes.func.isRequired,
  onScrub: PropTypes.func.isRequired,
  expanded: PropTypes.bool.isRequired,
  preferenceHydrated: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default React.memo(HomeValueChart);
