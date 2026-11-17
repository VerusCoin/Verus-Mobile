/*
  VerusIdReadyCard
  - The Home card for a VerusID that is ready (owner chose celebration C,
    2026-10-22, then removed its border). It keeps card A's layout on a soft
    blue-to-green tint.
  - The first time it shows, it celebrates once (2.2 s): the tint blooms, the
    name rises into place, "is ready" fades up, and 12 confetti pieces fall
    behind the text. With reduced motion, the tint only fades in.
  - `celebrate` comes from the notification's `celebrated` flag. The parent
    saves the flag in `onCelebrated`, which runs when the animation starts.
*/
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppButton from '../../../components/AppButton';
import {fontStyle} from '../../../globals/fonts';

const TOTAL_MS = 2200;
const CARD_RADIUS = 16;

// The card's own material, approved in mockup C. It is not a theme token: like
// the gift card material, it exists only on this card.
const PALETTE = {
  light: {
    tint: ['#DEE8FC', '#E5EDFC', '#E2F1E7'],
    pieces: ['#3165D4', '#4AA658', '#7FA3EA', '#86C98F'],
    pieceOpacity: 0.7,
  },
  dark: {
    tint: ['#21509A', '#1C4181', '#1C4E66'],
    pieces: ['#5F8FF0', '#4FAE67', '#7FA3EA', '#6BBF7C'],
    pieceOpacity: 0.55,
  },
};

// x (share of the width), start s, end s, streamer or dot, color, fall (share
// of the height), sway pt, start angle, spin degrees. Fixed, so it looks the
// same every time.
const PIECES = [
  [0.06, 0.3, 2.06, 's', 0, 0.8, 5, -25, 260],
  [0.14, 0.12, 1.98, 'd', 1, 0.7, -6, 0, 200],
  [0.22, 0.52, 2.16, 's', 2, 0.95, 7, 40, -300],
  [0.3, 0.22, 2.02, 's', 1, 0.85, -5, -60, 240],
  [0.38, 0.6, 2.2, 'd', 3, 0.78, 6, 0, 180],
  [0.46, 0.14, 1.95, 's', 0, 0.9, -7, 15, -280],
  [0.54, 0.44, 2.12, 's', 3, 0.75, 5, -35, 300],
  [0.62, 0.18, 2.0, 'd', 0, 0.88, -6, 0, 220],
  [0.7, 0.56, 2.18, 's', 1, 0.82, 7, 50, -260],
  [0.78, 0.26, 2.04, 's', 2, 0.92, -5, -10, 250],
  [0.86, 0.4, 2.1, 'd', 1, 0.72, 6, 0, -190],
  [0.94, 0.1, 1.96, 's', 3, 0.86, -6, 30, 270],
];

const easeOutCubic = Easing.out(Easing.cubic);
const easeOutQuad = Easing.out(Easing.quad);
const easeInOutQuad = Easing.inOut(Easing.quad);

const clamp01 = value => {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
};

const segment = (value, from, to, a, b) => {
  'worklet';
  return a + (b - a) * clamp01((value - from) / (to - from));
};

const ConfettiPiece = ({color, height, piece, pieceOpacity, time, width}) => {
  const [x, start, end, kind, , fall, sway, angle, spin] = piece;
  const startMs = start * 1000;
  const durationMs = (end - start) * 1000;
  const distance = fall * height + 14;

  const style = useAnimatedStyle(() => {
    const progress = clamp01((time.value - startMs) / durationMs);
    let opacity = 0;

    if (progress > 0 && progress < 1) {
      if (progress < 0.1) opacity = (progress / 0.1) * pieceOpacity;
      else if (progress < 0.55) opacity = pieceOpacity;
      else opacity = (1 - (progress - 0.55) / 0.45) * pieceOpacity;
    }

    let drift;
    if (progress < 0.3) drift = segment(progress, 0, 0.3, 0, sway);
    else if (progress < 0.65) drift = segment(progress, 0.3, 0.65, sway, -0.8 * sway);
    else drift = segment(progress, 0.65, 1, -0.8 * sway, 0.4 * sway);

    // The piece turns over twice while it falls.
    let squeeze;
    if (progress < 0.25) squeeze = segment(progress, 0, 0.25, 1, 0.2);
    else if (progress < 0.5) squeeze = segment(progress, 0.25, 0.5, 0.2, 1);
    else if (progress < 0.75) squeeze = segment(progress, 0.5, 0.75, 1, 0.3);
    else squeeze = segment(progress, 0.75, 1, 0.3, 1);

    return {
      opacity,
      transform: [
        {translateX: drift},
        {translateY: -14 + distance * easeOutQuad(progress)},
        {rotate: `${angle + spin * progress}deg`},
        {scaleX: squeeze},
      ],
    };
  });

  return (
    <Animated.View
      style={[
        kind === 's' ? styles.streamer : styles.dot,
        {backgroundColor: color, left: x * width},
        style,
      ]}
    />
  );
};

const VerusIdReadyCard = ({
  active,
  celebrate,
  highlight,
  label,
  onAction,
  onCelebrated,
  onDismiss,
  remainder,
  theme,
}) => {
  const reducedMotion = useReducedMotion();
  const palette = theme.isDark ? PALETTE.dark : PALETTE.light;
  // The decision belongs to the first render: saving the flag re-renders the
  // card while the celebration still plays.
  const playRef = useRef(Boolean(celebrate));
  const startedRef = useRef(false);
  const [size, setSize] = useState(null);
  const time = useSharedValue(playRef.current ? 0 : TOTAL_MS);
  const fade = useSharedValue(playRef.current ? 0 : 1);
  const gradientId = useRef(`verusIdReady${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!playRef.current || startedRef.current || !active || !size) return;

    startedRef.current = true;
    onCelebrated?.();

    if (reducedMotion) {
      time.value = TOTAL_MS;
      fade.value = withTiming(1, {duration: 300, easing: easeOutQuad});
      return;
    }

    fade.value = 1;
    time.value = withTiming(TOTAL_MS, {
      duration: TOTAL_MS,
      easing: Easing.linear,
    });
  }, [active, fade, onCelebrated, reducedMotion, size, time]);

  const onLayout = useCallback(event => {
    const {height, width} = event.nativeEvent.layout;

    setSize(current =>
      current && current.width === width && current.height === height
        ? current
        : {height, width},
    );
  }, []);

  const tintStyle = useAnimatedStyle(() => ({
    opacity: fade.value * easeOutQuad(segment(time.value, 50, 950, 0, 1)),
  }));
  const nameStyle = useAnimatedStyle(() => {
    const progress = segment(time.value, 200, 820, 0, 1);
    let translateY;
    let opacity;

    if (progress < 0.6) {
      const eased = easeOutCubic(progress / 0.6);
      translateY = 10 - 12 * eased;
      opacity = eased;
    } else {
      translateY = -2 + 2 * easeInOutQuad((progress - 0.6) / 0.4);
      opacity = 1;
    }

    return {opacity, transform: [{translateY}]};
  });
  const restStyle = useAnimatedStyle(() => {
    const eased = easeOutQuad(segment(time.value, 520, 940, 0, 1));

    return {opacity: eased, transform: [{translateY: 4 - 4 * eased}]};
  });

  return (
    <View
      onLayout={onLayout}
      style={[styles.card, {backgroundColor: theme.colors.surfaceMuted}]}>
      {size ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, tintStyle]}>
          <Svg height={size.height} width={size.width}>
            <Defs>
              <LinearGradient
                gradientUnits="userSpaceOnUse"
                id={`${gradientId}Tint`}
                x1={0}
                x2={size.width}
                y1={0}
                y2={size.height}>
                <Stop offset="0" stopColor={palette.tint[0]} />
                <Stop offset="0.55" stopColor={palette.tint[1]} />
                <Stop offset="1" stopColor={palette.tint[2]} />
              </LinearGradient>
            </Defs>
            <Rect
              fill={`url(#${gradientId}Tint)`}
              height={size.height}
              rx={CARD_RADIUS}
              width={size.width}
            />
          </Svg>
        </Animated.View>
      ) : null}

      {size && playRef.current && !reducedMotion ? (
        <View pointerEvents="none" style={styles.confetti}>
          {PIECES.map((piece, index) => (
            <ConfettiPiece
              key={index}
              color={palette.pieces[piece[4]]}
              height={size.height}
              piece={piece}
              pieceOpacity={palette.pieceOpacity}
              time={time}
              width={size.width}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.topRow}>
        <View style={styles.title}>
          <Animated.Text
            style={[theme.typography.bodySm, styles.name, {color: theme.colors.textPrimary}, nameStyle]}>
            {highlight}
          </Animated.Text>
          {remainder.length > 0 ? (
            <Animated.Text
              style={[theme.typography.bodySm, {color: theme.colors.textPrimary}, restStyle]}>
              {` ${remainder}`}
            </Animated.Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.dismissButton}>
          <MaterialCommunityIcons
            color={theme.colors.textSecondary}
            name="close"
            size={18}
          />
        </TouchableOpacity>
      </View>
      <AppButton
        buttonColor={theme.colors.surface}
        compact
        height={32}
        preserveHeightOnSmallWindow
        labelStyle={[theme.typography.labelSm, styles.actionLabel]}
        onPress={onAction}
        style={styles.action}
        themeMode={theme.mode}
        variant="secondary">
        {label}
      </AppButton>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
    paddingTop: 12,
    paddingRight: 0,
    paddingBottom: 12,
    paddingLeft: 14,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  streamer: {
    position: 'absolute',
    top: 0,
    width: 2.5,
    height: 12,
    marginLeft: -1.25,
    borderRadius: 1.25,
  },
  dot: {
    position: 'absolute',
    top: 0,
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 2.5,
  },
  topRow: {flexDirection: 'row', alignItems: 'flex-start'},
  title: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  name: {...fontStyle('semiBold')},
  dismissButton: {
    width: 44,
    height: 44,
    marginTop: -12,
    marginBottom: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {alignSelf: 'flex-start', marginTop: 10, borderRadius: 10},
  actionLabel: {
    marginVertical: 0,
    marginHorizontal: 12,
  },
});

export default VerusIdReadyCard;
