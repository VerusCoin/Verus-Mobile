import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, View} from 'react-native';
import {skeletonLoaderStyles as createSkeletonLoaderStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const PULSE_DURATION_MS = 1100;

const getDimensionStyle = (property, value) => {
  if (value == null) return null;
  return {[property]: value};
};

const normalizeRows = rows => {
  if (Array.isArray(rows)) return rows;
  const rowCount = Number.isInteger(rows) ? rows : 3;
  return Array.from({length: Math.max(0, rowCount)}, () => ({}));
};

const SkeletonLoader = ({
  accessibilityLabel,
  animated = true,
  children,
  style,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSkeletonLoaderStyles(theme), [theme]);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      pulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [animated, pulse]);

  const animatedStyle = animated
    ? {
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1],
        }),
      }
    : null;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessible={!!accessibilityLabel}
      style={[styles.container, style]}>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={animatedStyle}>
        {children}
      </Animated.View>
    </View>
  );
};

export const SkeletonBlock = ({
  color,
  height = 16,
  radius,
  style,
  width = '100%',
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSkeletonLoaderStyles(theme), [theme]);
  const resolvedRadius = radius == null ? theme.rounded.sm : radius;

  return (
    <View
      style={[
        styles.block,
        getDimensionStyle('width', width),
        getDimensionStyle('height', height),
        {
          borderRadius: resolvedRadius,
        },
        color ? {backgroundColor: color} : null,
        style,
      ]}
    />
  );
};

export const SkeletonText = ({
  height = 13,
  radius = 4,
  style,
  width = '100%',
}) => (
  <SkeletonBlock
    height={height}
    radius={radius}
    style={style}
    width={width}
  />
);

export const SkeletonRow = ({
  labelWidth = '34%',
  style,
  valueWidth = '78%',
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSkeletonLoaderStyles(theme), [theme]);

  return (
    <View style={[styles.row, style]}>
      <SkeletonText height={12} style={styles.rowLabel} width={labelWidth} />
      <SkeletonText height={17} width={valueWidth} />
    </View>
  );
};

export const SkeletonSection = ({
  rows = 3,
  style,
  titleWidth = '42%',
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSkeletonLoaderStyles(theme), [theme]);
  const normalizedRows = normalizeRows(rows);

  return (
    <View style={[styles.section, style]}>
      <SkeletonText
        height={13}
        style={styles.sectionTitle}
        width={titleWidth}
      />
      <View style={styles.rowGroup}>
        {normalizedRows.map((row, index) => (
          <SkeletonRow
            key={`${index}-${row.labelWidth || ''}-${row.valueWidth || ''}`}
            labelWidth={row.labelWidth}
            valueWidth={row.valueWidth}
          />
        ))}
      </View>
    </View>
  );
};

export default SkeletonLoader;
