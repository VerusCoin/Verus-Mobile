/*
  Wallet setup screen (owner chose variation E, 2026-10-22).

  The user's wallet icon sits in a thin ring over "Setting up <name>", with one
  slot per starting coin below and one line that names the current step. A
  coin shows when its key is made and the ring grows with each real step;
  nothing shows before its step is done. At the end a check settles on the
  icon, the title reads "<name> is ready", and the coins fly onto their rows
  on Home while the rest of the screen fades away.

  It is mounted at the root, above the navigator, because setup signs in and
  swaps the navigator before it ends.
*/

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, G, Path} from 'react-native-svg';
import AppButton from '../AppButton';
import SafeBottomActionStack from '../SafeBottomActionStack';
import WalletAvatar from '../WalletAvatar';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {
  WALLET_SETUP_HANDOFF,
  closeWalletSetup,
  getWalletSetupUnits,
  markWalletSetupShown,
  measureWalletSetupTargets,
  setWalletSetupHiddenLogos,
  useWalletSetupState,
} from './walletSetupStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// On the old architecture Reanimated sends props it does not know through the
// JS thread, which setup keeps busy. Let the ring's stroke props go straight
// to the native view so it keeps moving while keys are made.
Animated.addWhitelistedNativeProps({
  strokeDashoffset: true,
  strokeOpacity: true,
});

const HERO = 128;
const AVATAR = 96;
const RING_RADIUS = 60;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const BADGE = 32;
const COIN = 48;
const COIN_GAP = 24;

// A coin never shows before its key exists; these gaps only pace the reveal
// so a fast phone still shows each coin arrive.
const FIRST_COIN_DELAY = 400;
const COIN_GAP_MS = 360;
const STEP_GAP_MS = 220;
const READY_HOLD = 1100;
const TRAVEL = 650;
const STAGGER = 70;
const TARGET_WAIT = 3000;
const TARGET_RETRY = 150;
// Home has settled when two measurements in a row agree to this many points.
const SETTLE_TOLERANCE = 0.5;
// While the coins travel they follow their rows if Home still moves.
const FOLLOW_INTERVAL = 100;
const STEER = 160;
// The row logo fades in under the landed coin first, then the coin fades,
// so the hand-over never dims.
const HANDOFF_DELAY = WALLET_SETUP_HANDOFF;

const RING_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);
const TRAVEL_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const COIN_IN_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

const sameRects = (a, b) =>
  a.length === b.length &&
  a.every(
    (rect, index) =>
      Math.abs(rect.x - b[index].x) <= SETTLE_TOLERANCE &&
      Math.abs(rect.y - b[index].y) <= SETTLE_TOLERANCE &&
      Math.abs(rect.width - b[index].width) <= SETTLE_TOLERANCE &&
      Math.abs(rect.height - b[index].height) <= SETTLE_TOLERANCE,
  );

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const joinNames = names =>
  names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const isUnitDone = (setup, unit) => {
  if (setup.phase === 'finishing') return true;
  if (unit.type === 'key') return setup.keysMade.includes(unit.startId);

  return setup.stepsDone.includes(unit.type);
};

const getUnitLabel = (setup, unit) => {
  switch (unit?.type) {
    case 'key':
      return setup.restoring ? 'Restoring keys' : 'Creating keys';
    case 'encrypted':
      return 'Encrypting the wallet';
    case 'assets':
      return `Adding ${joinNames(
        setup.coins.map(coin => coin.presentation.name),
      )}`;
    case 'biometrics':
      return `Setting up ${setup.biometryName}`;
    case 'opened':
      return 'Opening the wallet';
    default:
      return '';
  }
};

// Text that fades out, changes, and fades back in.
const FadeSwapText = ({text, style, rise = false, reduceMotion, ...props}) => {
  const [shown, setShown] = useState(text);
  const opacity = useSharedValue(text ? 1 : 0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (text === shown) return undefined;

    if (reduceMotion) {
      setShown(text);
      opacity.value = withTiming(text ? 1 : 0, {duration: 150});
      return undefined;
    }

    opacity.value = withTiming(0, {duration: 140});
    const timer = setTimeout(() => {
      setShown(text);
      offset.value = rise ? 4 : 0;
      opacity.value = withTiming(text ? 1 : 0, {duration: 220});
      offset.value = withTiming(0, {duration: 220, easing: RING_EASING});
    }, 150);

    return () => clearTimeout(timer);
  }, [offset, opacity, reduceMotion, rise, shown, text]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: offset.value}],
  }));

  return (
    <Animated.Text {...props} style={[style, animatedStyle]}>
      {shown}
    </Animated.Text>
  );
};

const SetupCoin = React.forwardRef(
  ({coin, shown, faded, flight, onLanded, reduceMotion}, ref) => {
    const opacity = useSharedValue(0);
    const lift = useSharedValue(reduceMotion ? 0 : 8);
    const scale = useSharedValue(reduceMotion ? 1 : 0.92);
    // The flight runs once from 0 to 1; its end point moves with the row.
    const progress = useSharedValue(0);
    const endX = useSharedValue(0);
    const endY = useSharedValue(0);
    const endScale = useSharedValue(1);
    const flying = useRef(false);
    const inFlight = flight != null;
    // The landing callback is a worklet: give it only the id. A worklet
    // freezes what it captures (in development), and the coin's
    // presentation holds the live CoinDirectory records.
    const {coinId} = coin;

    useEffect(() => {
      if (!shown) return;

      const timing = {duration: 400, easing: COIN_IN_EASING};
      opacity.value = withTiming(1, timing);
      lift.value = reduceMotion ? 0 : withTiming(0, timing);
      scale.value = reduceMotion ? 1 : withTiming(1, timing);
    }, [lift, opacity, reduceMotion, scale, shown]);

    useEffect(() => {
      if (!faded) return;

      opacity.value = inFlight
        ? withDelay(
            HANDOFF_DELAY,
            withTiming(0, {duration: WALLET_SETUP_HANDOFF}),
          )
        : withTiming(0, {duration: 280});
    }, [faded, inFlight, opacity]);

    useEffect(() => {
      if (flight == null) return;

      if (!flying.current) {
        flying.current = true;
        endX.value = flight.dx;
        endY.value = flight.dy;
        endScale.value = flight.scale;
        progress.value = withDelay(
          flight.delay,
          withTiming(
            1,
            {duration: TRAVEL, easing: TRAVEL_EASING},
            finished => {
              if (finished) runOnJS(onLanded)(coinId);
            },
          ),
        );
        return;
      }

      // The row moved during the flight: bend toward its new place.
      const timing = {duration: STEER, easing: RING_EASING};
      endX.value = withTiming(flight.dx, timing);
      endY.value = withTiming(flight.dy, timing);
      endScale.value = withTiming(flight.scale, timing);
      // The flight starts once per run; later changes only move its end. The
      // shared values are stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flight]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [
        {translateX: endX.value * progress.value},
        {translateY: endY.value * progress.value + lift.value},
        {scale: scale.value * (1 + (endScale.value - 1) * progress.value)},
      ],
    }));

    return (
      <View ref={ref} collapsable={false} style={styles.coinBox}>
        <Animated.View style={animatedStyle}>
          <AssetCoinLogo
            coinId={coin.presentation.logoId}
            badgeTicker={coin.presentation.badgeTicker}
            size={COIN}
          />
        </Animated.View>
      </View>
    );
  },
);

const WalletSetupScreen = ({setup}) => {
  const theme = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  // The overlay remounts for each run, so its units are fixed at mount.
  const [runUnits] = useState(() => getWalletSetupUnits(setup));
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState('running');
  const [flights, setFlights] = useState(null);
  const [landedIds, setLandedIds] = useState([]);
  const startedAt = useRef(Date.now());
  const lastRevealAt = useRef(Date.now());
  const coinRefs = useRef({});
  const endStarted = useRef(false);
  const mounted = useRef(true);

  const screenOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(1);
  const heroScale = useSharedValue(reduceMotion ? 1 : 0.96);
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const breathe = useSharedValue(0.28);
  const badge = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const statusShift = useSharedValue(0);

  const failed = setup.phase === 'failed';
  const total = runUnits.length;
  // Slots follow Home's row order (set by the caller), so each coin flies
  // straight down to its row; coins still show in key order.
  const [slotCoins] = useState(() =>
    [...setup.coins].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)),
  );
  const revealedCoinIds = runUnits
    .slice(0, revealed)
    .filter(unit => unit.type === 'key')
    .map(unit => unit.coinId);

  useEffect(() => {
    mounted.current = true;
    Keyboard.dismiss();
    // Let setup start once this screen is on the display.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => markWalletSetupShown('screen')),
    );
    screenOpacity.value = withTiming(1, {duration: 250});
    heroScale.value = reduceMotion
      ? 1
      : withTiming(1, {duration: 450, easing: RING_EASING});

    if (!reduceMotion) {
      breathe.value = withRepeat(
        withSequence(
          withTiming(0.45, {duration: 900, easing: Easing.inOut(Easing.ease)}),
          withTiming(0.16, {duration: 900, easing: Easing.inOut(Easing.ease)}),
        ),
        -1,
      );
    }

    return () => {
      mounted.current = false;
      cancelAnimation(breathe);
    };
    // Runs once per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal the next finished unit, paced so each one can be seen.
  useEffect(() => {
    if (failed || stage !== 'running' || revealed >= total) return undefined;

    const next = runUnits[revealed];

    if (!isUnitDone(setup, next)) return undefined;

    const minGap =
      next.type === 'key'
        ? revealed === 0
          ? FIRST_COIN_DELAY
          : COIN_GAP_MS
        : STEP_GAP_MS;
    const since =
      Date.now() - (revealed === 0 ? startedAt.current : lastRevealAt.current);
    const timer = setTimeout(() => {
      lastRevealAt.current = Date.now();
      setRevealed(count => count + 1);
    }, Math.max(0, minGap - since));

    return () => clearTimeout(timer);
  }, [failed, revealed, runUnits, setup, stage, total]);

  // Release the waiting setup step once its reveal has started on screen;
  // the next step may block the JS thread.
  useEffect(() => {
    if (revealed === 0) return;

    const unit = runUnits[revealed - 1];

    requestAnimationFrame(() =>
      requestAnimationFrame(() => markWalletSetupShown(unit.key)),
    );
  }, [revealed, runUnits]);

  useEffect(() => {
    const progress = total > 0 ? revealed / total : 0;

    ringProgress.value = reduceMotion
      ? progress
      : withTiming(progress, {duration: 350, easing: RING_EASING});
  }, [reduceMotion, revealed, ringProgress, total]);

  useEffect(() => {
    if (!failed) return;

    cancelAnimation(breathe);
    breathe.value = withTiming(0, {duration: 200});
    ringOpacity.value = withTiming(0.4, {duration: 500});
    footerOpacity.value = withDelay(100, withTiming(1, {duration: 250}));
    // The coins are gone, so the reason moves up under the title.
    statusShift.value = withTiming(-(COIN + 28), {
      duration: reduceMotion ? 0 : 350,
      easing: RING_EASING,
    });
  }, [breathe, failed, footerOpacity, reduceMotion, ringOpacity, statusShift]);

  const close = useCallback(() => {
    setWalletSetupHiddenLogos([]);
    closeWalletSetup(setup.runId);
  }, [setup.runId]);

  const fadeOutAndClose = useCallback(() => {
    setStage('leaving');
    screenOpacity.value = withTiming(0, {duration: 300}, finished => {
      if (finished) runOnJS(close)();
    });
    // A cancelled fade must not leave an invisible screen over the app.
    setTimeout(close, 1000);
  }, [close, screenOpacity]);

  const onLanded = useCallback(
    coinId => {
      setLandedIds(ids => (ids.includes(coinId) ? ids : [...ids, coinId]));
    },
    [],
  );

  // Show each Home logo as its coin lands, then close.
  useEffect(() => {
    if (flights == null) return undefined;

    setWalletSetupHiddenLogos(
      setup.coins
        .map(coin => coin.coinId)
        .filter(coinId => !landedIds.includes(coinId)),
    );

    if (landedIds.length < setup.coins.length) return undefined;

    const timer = setTimeout(close, HANDOFF_DELAY + WALLET_SETUP_HANDOFF + 50);
    return () => clearTimeout(timer);
    // setup.coins is fixed for one run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close, flights, landedIds]);

  const measureCoins = () =>
    Promise.all(
      slotCoins.map(
        coin =>
          new Promise(resolve => {
            const view = coinRefs.current[coin.coinId];

            if (view == null) {
              resolve(null);
              return;
            }

            view.measureInWindow((x, y, width, height) =>
              resolve(width > 0 ? {x, y, width, height} : null),
            );
          }),
      ),
    );

  // Home's row logos once they exist and have stopped moving: two
  // measurements in a row agree. Null if Home is not ready in time.
  const waitForHome = async () => {
    const coinIds = slotCoins.map(coin => coin.coinId);
    const deadline = Date.now() + TARGET_WAIT;
    let previous = null;

    while (mounted.current && Date.now() < deadline) {
      const rects = await measureWalletSetupTargets(coinIds);
      const found = rects.every(Boolean);

      if (found && previous != null && sameRects(rects, previous)) {
        return rects;
      }

      previous = found ? rects : null;
      await wait(TARGET_RETRY);
    }

    return null;
  };

  const getFlights = (origins, targets) =>
    origins.map((origin, index) => {
      const target = targets[index];

      return {
        delay: index * STAGGER,
        dx: target.x + target.width / 2 - (origin.x + origin.width / 2),
        dy: target.y + target.height / 2 - (origin.y + origin.height / 2),
        scale: target.width / COIN,
      };
    });

  // Home can still move while the coins travel. Measure the rows again until
  // the last coin lands, and move a coin's end point when its row moved.
  const followHome = async (origins, targets) => {
    const coinIds = slotCoins.map(coin => coin.coinId);
    const deadline = Date.now() + TRAVEL + STAGGER * slotCoins.length;
    let current = targets;

    while (mounted.current && Date.now() < deadline) {
      await wait(FOLLOW_INTERVAL);

      const rects = await measureWalletSetupTargets(coinIds);
      const next = current.map((rect, index) => rects[index] || rect);

      if (mounted.current && !sameRects(next, current)) {
        current = next;
        setFlights(getFlights(origins, next));
      }
    }
  };

  const flyToHome = async () => {
    if (!setup.landOnHome) {
      fadeOutAndClose();
      return;
    }

    const targets = await waitForHome();
    const origins = targets ? await measureCoins() : null;

    if (!mounted.current) return;

    if (reduceMotion || targets == null || !origins.every(Boolean)) {
      fadeOutAndClose();
      return;
    }

    setWalletSetupHiddenLogos(setup.coins.map(coin => coin.coinId));
    setStage('flying');
    // Close even if a landing callback never arrives.
    setTimeout(close, TRAVEL + STAGGER * slotCoins.length + 1500);
    contentOpacity.value = withTiming(0, {duration: 350});
    backgroundOpacity.value = withTiming(0, {duration: 350});
    setFlights(getFlights(origins, targets));
    followHome(origins, targets);
  };

  // All steps are shown and setup has ended: the check, then the flight.
  useEffect(() => {
    if (
      endStarted.current ||
      setup.phase !== 'finishing' ||
      revealed < total
    ) {
      return undefined;
    }

    endStarted.current = true;
    setStage('ready');
    cancelAnimation(breathe);
    breathe.value = withTiming(0, {duration: 200});
    badge.value = reduceMotion
      ? withTiming(1, {duration: 200})
      : withSpring(1, {damping: 11, stiffness: 180, mass: 0.6});
    AccessibilityInfo.announceForAccessibility(
      `${setup.walletName} is ready`,
    );

    // The first of Home's two settle measurements runs before the hold ends,
    // so the coins still leave after READY_HOLD when Home is settled.
    const timer = setTimeout(
      flyToHome,
      setup.landOnHome ? READY_HOLD - TARGET_RETRY : READY_HOLD,
    );
    return () => clearTimeout(timer);
    // flyToHome reads refs and the fixed run setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badge, breathe, reduceMotion, revealed, setup.phase, total]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (failed && setup.error) {
          (setup.error.onSecondary || setup.error.onPrimary)?.();
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [failed, setup.error]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * (1 - ringProgress.value),
    strokeOpacity: ringProgress.value > 0 ? 1 : 0,
  }));
  const segmentProps = useAnimatedProps(() => ({
    strokeDashoffset: -RING_LENGTH * ringProgress.value,
    strokeOpacity: ringProgress.value < 1 ? breathe.value : 0,
  }));
  const screenStyle = useAnimatedStyle(() => ({opacity: screenOpacity.value}));
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{scale: heroScale.value}],
  }));
  const ringStyle = useAnimatedStyle(() => ({opacity: ringOpacity.value}));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value * 2),
    transform: [{scale: reduceMotion ? 1 : 0.5 + badge.value * 0.5}],
  }));
  const footerStyle = useAnimatedStyle(() => ({opacity: footerOpacity.value}));
  const statusStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{translateY: statusShift.value}],
  }));

  const nextUnit = runUnits[Math.min(revealed, total - 1)];
  let title = `${setup.restoring ? 'Restoring' : 'Setting up'} ${
    setup.walletName
  }`;
  let status = getUnitLabel(setup, nextUnit);

  if (failed) {
    title = setup.error?.title || `${setup.walletName} was not created`;
    status = setup.error?.message || '';
  } else if (stage !== 'running') {
    title = `${setup.walletName} is ready`;
    status = '';
  }

  const checkColor = theme.isDark ? theme.colors.background : '#FFFFFF';

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.root, screenStyle]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: theme.colors.background},
          backgroundStyle,
        ]}
      />
      <View style={styles.center}>
        <Animated.View
          accessibilityRole="progressbar"
          accessibilityLabel={title}
          accessibilityValue={{min: 0, max: total, now: revealed}}
          style={[styles.hero, heroStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
            <Svg width={HERO} height={HERO}>
              <G transform={`rotate(-90 ${HERO / 2} ${HERO / 2})`}>
                <Circle
                  cx={HERO / 2}
                  cy={HERO / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.colors.border}
                  strokeWidth={3}
                />
                <AnimatedCircle
                  animatedProps={segmentProps}
                  cx={HERO / 2}
                  cy={HERO / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.colors.primary}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={`${RING_LENGTH / Math.max(total, 1)} ${RING_LENGTH}`}
                />
                <AnimatedCircle
                  animatedProps={ringProps}
                  cx={HERO / 2}
                  cy={HERO / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.colors.primary}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
                />
              </G>
            </Svg>
          </Animated.View>
          <WalletAvatar
            walletAvatar={setup.walletAvatar}
            size={AVATAR}
            emojiSize={48}
            style={styles.avatar}
          />
          <Animated.View
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.success,
                borderColor: theme.colors.background,
              },
              badgeStyle,
            ]}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path
                d="M20 6 9 17l-5-5"
                fill="none"
                stroke={checkColor}
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.titleWrap, contentStyle]}>
          <FadeSwapText
            accessibilityRole="header"
            numberOfLines={2}
            reduceMotion={reduceMotion}
            style={[styles.title, {color: theme.colors.textPrimary}]}
            text={title}
          />
        </Animated.View>

        <View style={styles.coinRow}>
          {slotCoins.map((coin, index) => {
            const shown = !failed && revealedCoinIds.includes(coin.coinId);

            return (
              <View
                key={coin.coinId}
                style={[styles.coinSlot, index > 0 && styles.coinSlotGap]}>
                <Animated.View style={[styles.coinDisc, contentStyle]}>
                  <View
                    style={[
                      styles.coinDisc,
                      {backgroundColor: theme.colors.border},
                      (shown || failed) && styles.hidden,
                    ]}
                  />
                </Animated.View>
                <SetupCoin
                  ref={view => {
                    coinRefs.current[coin.coinId] = view;
                  }}
                  coin={coin}
                  faded={failed || landedIds.includes(coin.coinId)}
                  flight={flights ? flights[index] : null}
                  onLanded={onLanded}
                  reduceMotion={reduceMotion}
                  shown={shown || stage !== 'running'}
                />
              </View>
            );
          })}
        </View>

        <Animated.View style={[styles.statusWrap, statusStyle]}>
          <FadeSwapText
            accessibilityLiveRegion="polite"
            reduceMotion={reduceMotion}
            rise
            style={[styles.status, {color: theme.colors.textSecondary}]}
            text={status}
          />
        </Animated.View>
      </View>

      {failed && setup.error ? (
        <Animated.View style={[styles.footer, footerStyle]}>
          <SafeBottomActionStack gap={10}>
            <AppButton
              onPress={setup.error.onPrimary}
              themeMode={theme.mode}
              variant="primary">
              {setup.error.primaryLabel}
            </AppButton>
            {setup.error.secondaryLabel ? (
              <AppButton
                onPress={setup.error.onSecondary}
                themeMode={theme.mode}
                variant="secondary">
                {setup.error.secondaryLabel}
              </AppButton>
            ) : null}
          </SafeBottomActionStack>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const WalletSetupOverlay = () => {
  const setup = useWalletSetupState();

  if (!setup.visible) return null;

  return <WalletSetupScreen key={setup.runId} setup={setup} />;
};

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
    zIndex: 1000,
    elevation: 1000,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    overflow: 'visible',
  },
  hero: {
    width: HERO,
    height: HERO,
  },
  avatar: {
    position: 'absolute',
    left: (HERO - AVATAR) / 2,
    top: (HERO - AVATAR) / 2,
  },
  badge: {
    position: 'absolute',
    left: 82,
    top: 82,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    textAlign: 'center',
    ...fontStyle('semiBold'),
  },
  coinRow: {
    flexDirection: 'row',
    marginTop: 28,
    overflow: 'visible',
  },
  coinSlot: {
    width: COIN,
    height: COIN,
    overflow: 'visible',
  },
  coinSlotGap: {
    marginLeft: COIN_GAP,
  },
  coinDisc: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: COIN / 2,
  },
  coinBox: {
    width: COIN,
    height: COIN,
    overflow: 'visible',
  },
  hidden: {
    opacity: 0,
  },
  statusWrap: {
    marginTop: 20,
    minHeight: 22,
    alignSelf: 'stretch',
  },
  status: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    ...fontStyle('regular'),
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default WalletSetupOverlay;
