/*
  "Claiming funds" (owner chose variation A, 2026-10-23).

  The secure task screen with a small gift card on the left and the user's
  wallet icon on the right. Every 1.8 s a coin slides out of the card and arcs
  into the wallet. The card never empties, so nothing looks finished before
  the broadcast returns. When it returns (`done`), the card dims, the green
  check of wallet setup settles on the wallet icon, and the screen fades out
  for the result (`onDone`). A failure never sets `done`: the caller shows its
  error at once.

  With Reduce Motion only opacity changes: three dots between the card and the
  wallet fade in turn, and the check fades in. Reanimated skips animations
  when the system asks for less motion, so every animation here sets
  `ReduceMotion.Never` and this file decides what moves.
*/

import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import WalletAvatar from '../../../components/WalletAvatar';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getAssetPresentation} from '../../../utils/assets/assetPresentation';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {getSpendableKeyReviewModel} from '../../../utils/spendableKey/spendableKeyReview';
import {getTicketOutline} from '../../../utils/ticketOutline';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';
import {SecureLoadingView} from '../../SecureLoading/SecureLoading';
import {
  GIFT_CARD_FRONT,
  GIFT_CARD_STROKE,
} from '../../Services/ServiceComponents/GiftCardService/GiftCardFixedCard';

// Geometry of the approved mockup, in points.
const HERO_WIDTH = 248;
const HERO_HEIGHT = 96;
const MID_Y = 48;
const CARD_WIDTH = 92;
const CARD_HEIGHT = 58;
const CARD_TOP = 19;
const CARD_CORNER = 12;
const CARD_NOTCH = 6;
const AVATAR = 56;
const AVATAR_LEFT = 192;
const AVATAR_TOP = 20;
const AVATAR_CENTER_X = AVATAR_LEFT + AVATAR / 2;
const COIN = 28;
const COIN_START_X = CARD_WIDTH - 16;
const COIN_OUT_X = CARD_WIDTH + 18;
const COIN_ARC = 16;
const COIN_LANDED_SCALE = 0.78;
const BADGE = 24;
// The check sits on the icon's edge at 45 degrees, as on wallet setup.
const BADGE_CENTER_OFFSET = (AVATAR / 2) * Math.SQRT1_2;
const DOT = 5;
const DOT_CENTERS = [124, 142, 160];

// One loop: 0-320 ms the coin slides out from under the card, 320-1320 ms it
// arcs to the wallet and slips under it, then it rests until 1800 ms.
const PERIOD = 1800;
const SLIDE_END = 320;
const LAND_AT = 1320;
const COIN_FADE_IN = 120;
const BUMP_START = 950;
const BUMP_END = 1300;
const BUMP = 0.045;
const DOT_STAGGER = 300;
const DOT_PULSE = 900;

// The hand-off, in ms after the broadcast returns.
const STATUS_FADE = 200;
const CARD_DIM = 350;
const CARD_DIMMED = 0.5;
const BADGE_AT = 150;
const BADGE_FADE = 200;
// A coin in its last 500 ms of flight lands before the check; an earlier one
// fades on its way, so the hand-off never waits long.
const MAX_LANDING_WAIT = 500;
const LANDING_TO_BADGE = 80;
const HOLD = 1100;
const SCREEN_FADE = 180;
const FALLBACK_SLACK = 500;

const NEVER = ReduceMotion.Never;
const BADGE_SPRING = {damping: 11, stiffness: 180, mass: 0.6, reduceMotion: NEVER};

const clamp01 = value => {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
};

const lerp = (from, to, progress) => {
  'worklet';
  return from + (to - from) * progress;
};

const segment = (value, start, end) => {
  'worklet';
  return clamp01((value - start) / (end - start));
};

// A CSS-style cubic bezier, solved with Newton steps.
const cubicBezier = (x1, y1, x2, y2, x) => {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let t = x;

  for (let i = 0; i < 8; i++) {
    const error = ((ax * t + bx) * t + cx) * t - x;
    const slope = (3 * ax * t + 2 * bx) * t + cx;

    if (Math.abs(error) < 1e-6 || Math.abs(slope) < 1e-6) break;
    t -= error / slope;
  }

  t = clamp01(t);
  return ((ay * t + by) * t + cy) * t;
};

// The wallet setup curves (WalletSetupOverlay.js).
const coinInEasing = x => {
  'worklet';
  return cubicBezier(0.2, 0.7, 0.2, 1, x);
};

const travelEasing = x => {
  'worklet';
  return cubicBezier(0.4, 0, 0.2, 1, x);
};

const readCoinPresentation = coin => {
  try {
    return getAssetPresentation(coin);
  } catch (e) {
    return null;
  }
};

// The coin that flies: the claimed currency, preferring the chain's own coin
// when a card holds several. A currency without a logo uses its chain's coin,
// because a "?" coin would look like a fault.
export const getClaimAnimationCoin = (claimPlan, isTestnet) => {
  const fallback = {iconId: isTestnet ? 'VRSCTEST' : 'VRSC', badgeTicker: null};

  if (claimPlan == null) return fallback;

  const {balances, systems} = getSpendableKeyReviewModel(claimPlan);
  const main =
    balances.find(
      ({currency, system}) =>
        currency.currencyId === (system.coinObj?.currency_id || system.systemId),
    ) || balances[0];
  const system = main?.system || systems[0];

  if (main != null) {
    const presentation = readCoinPresentation({
      id: main.currency.currencyId,
      currency_id: main.currency.currencyId,
      system_id: system.systemId,
      proto: 'vrsc',
      testnet: !!isTestnet,
      display_name: main.currency.display?.name || main.currency.currencyId,
    });

    if (presentation?.iconId) {
      return {
        iconId: presentation.iconId,
        badgeTicker: presentation.badgeTicker || null,
      };
    }
  }

  if (system?.coinObj != null) {
    const presentation = readCoinPresentation(system.coinObj);

    if (presentation?.iconId) {
      return {
        iconId: presentation.iconId,
        badgeTicker: presentation.badgeTicker || null,
      };
    }
  }

  return fallback;
};

const ReducedMotionDot = ({clock, color, fade, index}) => {
  const style = useAnimatedStyle(() => {
    const phase =
      (((clock.value - index * DOT_STAGGER) % PERIOD) + PERIOD) % PERIOD;
    const pulse = Math.sin(Math.PI * segment(phase, 0, DOT_PULSE));

    return {opacity: (0.22 + 0.68 * pulse) * fade.value};
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {backgroundColor: color, left: DOT_CENTERS[index] - DOT / 2},
        style,
      ]}
    />
  );
};

const ClaimHero = ({
  badge,
  cardOpacity,
  clock,
  coin,
  coinFade,
  dotsFade,
  reduceMotion,
  walletAvatar,
}) => {
  const theme = useOnboardingTheme();
  const avatar = normalizeWalletAvatar(walletAvatar);
  const checkColor = theme.isDark ? theme.colors.background : '#FFFFFF';

  const coinStyle = useAnimatedStyle(() => {
    const u = clock.value;
    let x = AVATAR_CENTER_X;
    let y = MID_Y;
    let scale = COIN_LANDED_SCALE;
    let opacity = 0;

    if (u < SLIDE_END) {
      x = lerp(COIN_START_X, COIN_OUT_X, coinInEasing(u / SLIDE_END));
      scale = 1;
      opacity = clamp01(u / COIN_FADE_IN);
    } else if (u < LAND_AT) {
      const progress = travelEasing((u - SLIDE_END) / (LAND_AT - SLIDE_END));

      x = lerp(COIN_OUT_X, AVATAR_CENTER_X, progress);
      y = MID_Y - COIN_ARC * Math.sin(Math.PI * progress);
      scale = lerp(1, COIN_LANDED_SCALE, progress);
      opacity = 1;
    }

    return {
      opacity: opacity * coinFade.value,
      transform: [
        {translateX: x - COIN / 2},
        {translateY: y - COIN / 2},
        {scale},
      ],
    };
  });
  // The wallet takes the coin with a small lift.
  const avatarStyle = useAnimatedStyle(() => {
    const bump =
      Math.sin(Math.PI * segment(clock.value, BUMP_START, BUMP_END)) *
      BUMP *
      coinFade.value;

    return {transform: [{scale: 1 + bump}]};
  });
  const cardStyle = useAnimatedStyle(() => ({opacity: cardOpacity.value}));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value * 2),
    transform: [{scale: reduceMotion ? 1 : 0.5 + badge.value * 0.5}],
  }));

  return (
    <View style={styles.hero}>
      {reduceMotion ? (
        DOT_CENTERS.map((center, index) => (
          <ReducedMotionDot
            clock={clock}
            color={theme.colors.primary}
            fade={dotsFade}
            index={index}
            key={center}
          />
        ))
      ) : (
        <Animated.View style={[styles.coin, coinStyle]}>
          <AssetCoinLogo
            badgeTicker={coin.badgeTicker}
            coinId={coin.iconId}
            size={COIN}
          />
        </Animated.View>
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <Svg height={CARD_HEIGHT} width={CARD_WIDTH}>
          <Path
            d={getTicketOutline(
              CARD_WIDTH,
              CARD_HEIGHT,
              CARD_HEIGHT / 2,
              CARD_CORNER,
              CARD_NOTCH,
            )}
            fill={GIFT_CARD_FRONT}
            stroke={GIFT_CARD_STROKE}
            strokeWidth={1}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.avatar, avatarStyle]}>
        {avatar ? (
          <WalletAvatar emojiSize={28} size={AVATAR} walletAvatar={avatar} />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {backgroundColor: theme.colors.surfaceMuted},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.textSecondary}
              name="wallet-outline"
              size={28}
            />
          </View>
        )}
      </Animated.View>
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: theme.colors.success,
            borderColor: theme.colors.background,
          },
          badgeStyle,
        ]}>
        <Svg height={12} viewBox="0 0 24 24" width={12}>
          <Path
            d="M20 6 9 17l-5-5"
            fill="none"
            stroke={checkColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3.2}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const ClaimingFundsView = ({coin, done, onDone, slow, walletAvatar}) => {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const coinFade = useSharedValue(1);
  const dotsFade = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const badge = useSharedValue(0);
  const statusOpacity = useSharedValue(1);
  const screenOpacity = useSharedValue(1);
  const handoffStarted = useRef(false);
  const finished = useRef(false);
  const mounted = useRef(true);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  useEffect(() => {
    mounted.current = true;
    clock.value = withRepeat(
      withTiming(PERIOD, {duration: PERIOD, easing: Easing.linear, reduceMotion: NEVER}),
      -1,
      false,
      undefined,
      NEVER,
    );

    return () => {
      mounted.current = false;
      cancelAnimation(clock);
    };
  }, [clock]);

  useEffect(() => {
    if (!done || handoffStarted.current) return undefined;

    handoffStarted.current = true;
    let badgeAt = BADGE_AT;

    if (reduceMotion) {
      dotsFade.value = withTiming(0, {duration: STATUS_FADE, reduceMotion: NEVER});
    } else {
      // No new coin leaves the card. The coin in flight continues at its pace.
      const u = clock.value;

      cancelAnimation(clock);

      if (u < LAND_AT) {
        const remaining = LAND_AT - u;

        clock.value = withTiming(LAND_AT, {
          duration: remaining,
          easing: Easing.linear,
          reduceMotion: NEVER,
        });

        if (u >= SLIDE_END && remaining <= MAX_LANDING_WAIT) {
          badgeAt = Math.max(BADGE_AT, remaining + LANDING_TO_BADGE);
        } else {
          coinFade.value = withTiming(0, {duration: 180, reduceMotion: NEVER});
        }
      }
    }

    const finish = () => {
      if (finished.current || !mounted.current) return;

      finished.current = true;
      onDoneRef.current?.();
    };

    statusOpacity.value = withTiming(0, {duration: STATUS_FADE, reduceMotion: NEVER});
    // The card is spent.
    cardOpacity.value = withTiming(CARD_DIMMED, {
      duration: CARD_DIM,
      easing: Easing.out(Easing.quad),
      reduceMotion: NEVER,
    });
    badge.value = withDelay(
      badgeAt,
      reduceMotion
        ? withTiming(1, {duration: BADGE_FADE, reduceMotion: NEVER})
        : withSpring(1, BADGE_SPRING),
      NEVER,
    );
    screenOpacity.value = withDelay(
      badgeAt + HOLD,
      withTiming(0, {duration: SCREEN_FADE, reduceMotion: NEVER}, isDone => {
        if (isDone) runOnJS(finish)();
      }),
      NEVER,
    );

    // A cancelled fade must not leave the user on this screen.
    const timer = setTimeout(finish, badgeAt + HOLD + SCREEN_FADE + FALLBACK_SLACK);
    return () => clearTimeout(timer);
    // The hand-off runs once; the shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const contentStyle = useAnimatedStyle(() => ({opacity: screenOpacity.value}));
  const statusStyle = useAnimatedStyle(() => ({opacity: statusOpacity.value}));

  return (
    <SecureLoadingView
      contentStyle={contentStyle}
      illustration={
        <ClaimHero
          badge={badge}
          cardOpacity={cardOpacity}
          clock={clock}
          coin={coin}
          coinFade={coinFade}
          dotsFade={dotsFade}
          reduceMotion={reduceMotion}
          walletAvatar={walletAvatar}
        />
      }
      message="Claiming funds"
      slow={slow}
      status="loading"
      statusStyle={statusStyle}
    />
  );
};

const styles = StyleSheet.create({
  hero: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    overflow: 'visible',
  },
  coin: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: COIN,
    height: COIN,
    overflow: 'visible',
  },
  dot: {
    position: 'absolute',
    top: MID_Y - DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  card: {
    position: 'absolute',
    left: 0,
    top: CARD_TOP,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    // The mockup's soft drop shadow. iOS only: Android would draw a rectangle.
    shadowColor: '#07101F',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  avatar: {
    position: 'absolute',
    left: AVATAR_LEFT,
    top: AVATAR_TOP,
    width: AVATAR,
    height: AVATAR,
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    left: AVATAR_CENTER_X + BADGE_CENTER_OFFSET - BADGE / 2,
    top: MID_Y + BADGE_CENTER_OFFSET - BADGE / 2,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ClaimingFundsView;
