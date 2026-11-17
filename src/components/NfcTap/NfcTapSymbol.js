import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, Platform, View} from 'react-native';
import Svg, {Circle, G, Path} from 'react-native-svg';
import useReduceMotion from '../../hooks/useReduceMotion';
import {nfcTapStyles as createStyles} from '../../styles';
import {NFC_TAP_SYMBOL_SIZE} from '../../styles/components/nfcTap.styles';
import {useAppTheme} from '../../theme/app';
import {NFC_TAP_PHASE} from '../../utils/walletBackup/nfcTapText';

const SIZE = NFC_TAP_SYMBOL_SIZE;
const CENTER = SIZE / 2;
const RING_RADIUS = 58;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
// One turning segment, 22% of the ring.
const RING_DASH = `${RING_LENGTH * 0.22} ${RING_LENGTH * 0.78}`;
const WAVE_PATHS = [
  'M65.79 59.11 A9 9 0 0 1 65.79 72.89',
  'M70.93 52.98 A17 17 0 0 1 70.93 79.02',
  'M76.07 46.85 A25 25 0 0 1 76.07 85.15',
];
// The waves point to where the phone reads: up on iPhone, sideways on Android.
const WAVE_TRANSFORM =
  Platform.OS === 'ios'
    ? `rotate(-90 ${CENTER} ${CENTER}) translate(-9.5 0)`
    : 'translate(-9.5 0)';
const WAVE_STAGGER_MS = 180;
const CHECK_PATH = 'M48 67 L60 79 L85 53';
const CHECK_LENGTH = 54;
const SHAKE_OFFSETS = [-6, 5, -3, 2, 0];

const SESSION_PHASES = [
  NFC_TAP_PHASE.PREPARING,
  NFC_TAP_PHASE.WAITING,
  NFC_TAP_PHASE.ACTIVE,
  NFC_TAP_PHASE.RELEASE,
];
const TURNING_PHASES = [
  NFC_TAP_PHASE.PREPARING,
  NFC_TAP_PHASE.ACTIVE,
  NFC_TAP_PHASE.RELEASE,
];
const RESULT_PHASES = [
  NFC_TAP_PHASE.DONE,
  NFC_TAP_PHASE.FAILED,
  NFC_TAP_PHASE.NOTICE,
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

const timing = (value, toValue, options = {}) =>
  Animated.timing(value, {
    toValue,
    duration: 200,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
    ...options,
  });

// The contactless symbol: the waves pulse while the app waits for the card, a
// ring turns while it works, and the circle ends on a check or an exclamation
// mark.
export default function NfcTapSymbol({phase}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const valuesRef = useRef(null);

  if (valuesRef.current == null) {
    valuesRef.current = {
      waves: WAVE_PATHS.map(() => new Animated.Value(1)),
      ring: new Animated.Value(0),
      ringTurn: new Animated.Value(0),
      result: new Animated.Value(0),
      resultScale: new Animated.Value(1),
      // Drawn by the JS driver: SVG stroke props cannot use the native driver.
      check: new Animated.Value(CHECK_LENGTH),
      mark: new Animated.Value(0),
      ripple: new Animated.Value(0),
      rippleScale: new Animated.Value(1),
      shake: new Animated.Value(0),
    };
  }

  const values = valuesRef.current;

  useEffect(() => {
    const running = [];
    const start = animation => {
      running.push(animation);
      animation.start();
    };
    const inSession = SESSION_PHASES.includes(phase);
    const turning = TURNING_PHASES.includes(phase);

    if (phase === NFC_TAP_PHASE.WAITING && !reduceMotion) {
      values.waves.forEach((wave, index) => {
        wave.setValue(0.22);
        start(
          Animated.sequence([
            Animated.delay(index * WAVE_STAGGER_MS),
            Animated.loop(
              Animated.sequence([
                timing(wave, 1, {
                  duration: 600,
                  easing: Easing.inOut(Easing.ease),
                }),
                timing(wave, 0.22, {
                  duration: 900,
                  easing: Easing.inOut(Easing.ease),
                }),
              ]),
            ),
          ]),
        );
      });
    } else {
      const waveOpacity = !inSession
        ? 0
        : phase === NFC_TAP_PHASE.PREPARING
        ? 0.35
        : 1;
      values.waves.forEach(wave => start(timing(wave, waveOpacity)));
    }

    start(timing(values.ring, turning ? 1 : 0));
    if (turning && !reduceMotion) {
      values.ringTurn.setValue(0);
      start(
        Animated.loop(
          timing(values.ringTurn, 1, {
            duration: phase === NFC_TAP_PHASE.PREPARING ? 1100 : 900,
            easing: Easing.linear,
          }),
        ),
      );
    }

    if (!RESULT_PHASES.includes(phase)) {
      values.result.setValue(0);
      values.resultScale.setValue(1);
      values.check.setValue(CHECK_LENGTH);
      values.mark.setValue(0);
      values.ripple.setValue(0);
    } else if (phase === NFC_TAP_PHASE.DONE) {
      values.mark.setValue(0);

      if (reduceMotion) {
        values.result.setValue(1);
        values.resultScale.setValue(1);
        values.check.setValue(0);
      } else {
        values.resultScale.setValue(0.88);
        values.check.setValue(CHECK_LENGTH);
        values.ripple.setValue(0.7);
        values.rippleScale.setValue(1);
        start(timing(values.result, 1));
        start(
          timing(values.resultScale, 1, {
            duration: 500,
            easing: Easing.bezier(0.3, 1.6, 0.5, 1),
          }),
        );
        start(
          timing(values.check, 0, {
            delay: 160,
            duration: 340,
            easing: Easing.bezier(0.3, 0.7, 0.3, 1),
            useNativeDriver: false,
          }),
        );
        start(
          Animated.parallel([
            timing(values.ripple, 0, {
              delay: 140,
              duration: 800,
              easing: Easing.bezier(0.2, 0.7, 0.3, 1),
            }),
            timing(values.rippleScale, 1.55, {
              delay: 140,
              duration: 800,
              easing: Easing.bezier(0.2, 0.7, 0.3, 1),
            }),
          ]),
        );
      }
    } else {
      values.check.setValue(CHECK_LENGTH);
      values.resultScale.setValue(1);

      if (reduceMotion) {
        values.result.setValue(1);
        values.mark.setValue(1);
      } else {
        start(timing(values.result, 1));
        start(timing(values.mark, 1, {delay: 100}));
      }

      if (phase === NFC_TAP_PHASE.FAILED && !reduceMotion) {
        values.shake.setValue(0);
        start(
          Animated.sequence(
            SHAKE_OFFSETS.map(offset =>
              timing(values.shake, offset, {
                duration: 84,
                easing: Easing.linear,
              }),
            ),
          ),
        );
      }
    }

    return () => running.forEach(animation => animation.stop());
  }, [phase, reduceMotion, values]);

  const sessionColor =
    phase === NFC_TAP_PHASE.PREPARING
      ? theme.colors.textSubtle
      : theme.colors.primary;
  const idleColor =
    phase === NFC_TAP_PHASE.PREPARING
      ? theme.colors.surfaceMuted
      : theme.colors.primaryBackground;
  const resultColor =
    phase === NFC_TAP_PHASE.DONE
      ? theme.colors.success
      : phase === NFC_TAP_PHASE.NOTICE
      ? theme.colors.warningBackground
      : theme.colors.dangerBackground;
  const markColor =
    phase === NFC_TAP_PHASE.NOTICE ? theme.colors.warning : theme.colors.danger;
  const ringRotation = values.ringTurn.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.symbol, {transform: [{translateX: values.shake}]}]}>
      <View style={styles.layer}>
        <Animated.View
          style={[
            styles.ripple,
            {
              opacity: values.ripple,
              transform: [{scale: values.rippleScale}],
            },
          ]}
        />
      </View>
      <View style={styles.layer}>
        <View style={[styles.circle, {backgroundColor: idleColor}]} />
      </View>
      <View style={styles.layer}>
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: resultColor,
              opacity: values.result,
              transform: [{scale: values.resultScale}],
            },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.layer,
          {opacity: values.ring, transform: [{rotate: ringRotation}]},
        ]}>
        <Svg height={SIZE} width={SIZE}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            fill="none"
            r={RING_RADIUS}
            stroke={sessionColor}
            strokeDasharray={RING_DASH}
            strokeLinecap="round"
            strokeWidth={4}
          />
        </Svg>
      </Animated.View>
      {WAVE_PATHS.map((wavePath, index) => (
        <Animated.View
          key={wavePath}
          style={[styles.layer, {opacity: values.waves[index]}]}>
          <Svg height={SIZE} width={SIZE}>
            <G transform={WAVE_TRANSFORM}>
              <Path
                d={wavePath}
                fill="none"
                stroke={sessionColor}
                strokeLinecap="round"
                strokeWidth={6}
              />
            </G>
          </Svg>
        </Animated.View>
      ))}
      <View style={styles.layer}>
        <Svg height={SIZE} width={SIZE}>
          <AnimatedPath
            d={CHECK_PATH}
            fill="none"
            stroke={theme.colors.onPrimary}
            strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
            strokeDashoffset={values.check}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={7}
          />
        </Svg>
      </View>
      <Animated.View style={[styles.layer, {opacity: values.mark}]}>
        <Svg height={SIZE} width={SIZE}>
          <Path
            d={`M${CENTER} 46 V70`}
            stroke={markColor}
            strokeLinecap="round"
            strokeWidth={7}
          />
          <Circle cx={CENTER} cy={84} fill={markColor} r={4} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
