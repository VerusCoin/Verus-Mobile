import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, AppState, Platform, Text, Vibration, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {ArrowRight} from 'lucide-react-native';
import {getButtonHitSlop, useButtonHeight} from '../hooks/useButtonHeight';
import {useOnboardingTheme} from '../theme/onboarding';
import {gradientButtonStyles, slideToConfirmStyles as styles} from '../styles';

const THRESHOLD = 0.9;
const SPRING = {damping: 22, stiffness: 240, mass: 0.7};

export default function SlideToConfirm({
  label,
  hint: hintProp,
  onPress,
  disabled,
  loading,
  loadingText,
}) {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const height = useButtonHeight('primary');
  const thumbSize = height - 8;
  const [width, setWidth] = useState(0);
  const [hint, setHint] = useState(false);
  // Shows the loading text from the release until the parent sets loading.
  const [committing, setCommitting] = useState(false);
  const hintTimer = useRef(null);
  const mounted = useRef(true);
  const allowed = useRef(true);
  const latched = useRef(false);
  const latest = useRef({disabled, loading, onPress});
  latest.current = {disabled, loading, onPress};
  const x = useSharedValue(0);
  const epoch = useSharedValue(0);
  const dragEpoch = useSharedValue(-1);
  const dragging = useSharedValue(false);
  const travel = Math.max(0, width - height);
  const actionHint = hintProp ?? `${label.replace(/^Slide to /, 'Slide all the way to ')}.`;
  const isFocused = useCallback(() => navigation.isFocused(), [navigation]);
  // Android ignores the View hitSlop for RNGH, so the gesture host itself is
  // 48 points high. Negative margins keep the layout at the track height.
  const touchInset = getButtonHitSlop(height).top;

  const clearHint = useCallback(() => {
    clearTimeout(hintTimer.current);
    if (mounted.current) setHint(false);
  }, []);
  const invalidate = useCallback(() => {
    allowed.current = false;
    epoch.value += 1;
    dragging.value = false;
    cancelAnimation(x);
    x.value = 0;
    clearHint();
  }, [clearHint, dragging, epoch, x]);

  useLayoutEffect(() => {
    mounted.current = true;
    allowed.current = isFocused() && AppState.currentState === 'active';
    const focus = navigation.addListener('focus', () => {
      allowed.current = AppState.currentState === 'active';
      epoch.value += 1;
    });
    // beforeRemove also covers Back/X before blur has been delivered. Parent
    // listeners cover closing the entire wizard. Old gesture epochs stay dead.
    // A prevented removal keeps this screen focused without a new focus event,
    // so allow a fresh gesture again on the next tick when it is still here.
    const onBeforeRemove = () => {
      invalidate();
      setTimeout(() => {
        if (mounted.current && isFocused() && AppState.currentState === 'active') {
          allowed.current = true;
        }
      }, 0);
    };
    const removals = [navigation, navigation.getParent?.()].filter(Boolean)
      .map(nav => nav.addListener('beforeRemove', onBeforeRemove));
    const blur = navigation.addListener('blur', invalidate);
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') invalidate();
      else if (isFocused()) allowed.current = true;
    });
    return () => {
      mounted.current = false;
      invalidate();
      focus?.(); blur?.(); removals.forEach(remove => remove()); app.remove();
    };
  }, [epoch, invalidate, isFocused, navigation]);

  useLayoutEffect(() => {
    if (disabled || loading) {
      epoch.value += 1;
      dragging.value = false;
      x.value = 0;
      clearHint();
    } else if (isFocused() && AppState.currentState === 'active') {
      // A blocked Back during broadcast does not blur this screen. Once a
      // failed submit unlocks it, allow a fresh gesture with the new epoch.
      allowed.current = true;
    }
  }, [disabled, loading, clearHint, dragging, epoch, isFocused, x]);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const canAct = useCallback(token => mounted.current && allowed.current &&
    isFocused() && AppState.currentState === 'active' && token === epoch.value &&
    !latest.current.disabled && !latest.current.loading && !latched.current,
  [epoch, isFocused]);
  const begin = useCallback(token => {
    if (!canAct(token)) return;
    clearHint();
  }, [canAct, clearHint]);
  const incomplete = useCallback((token, showHint) => {
    if (!canAct(token) || !showHint) return;
    setHint(true);
    AccessibilityInfo.announceForAccessibility(actionHint);
    hintTimer.current = setTimeout(() => {
      if (mounted.current) setHint(false);
    }, 3000);
  }, [actionHint, canAct]);
  const complete = useCallback((token, progress = 1) => {
    if (!canAct(token)) return;
    // Set synchronously, before onPress or a React render. A queued second
    // release or accessibility activation cannot enter the payment handler.
    latched.current = true;
    clearHint();
    setCommitting(true);
    x.value = withTiming(travel, {duration: 120 + 180 * (1 - progress)});
    Vibration.vibrate(Platform.OS === 'ios' ? [0, 50] : 50);
    const release = () => {
      if (!mounted.current) return;
      // Each commit handler returns its full operation. A new gesture is
      // allowed only after that operation and its failure handling settle.
      epoch.value += 1;
      dragging.value = false;
      latched.current = false;
      setCommitting(false);
      allowed.current = isFocused() && AppState.currentState === 'active';
      x.value = withSpring(0, SPRING);
    };
    const run = () => {
      // The latch stays set while we wait. Check again that the screen is
      // still here and the action is still allowed before it commits.
      if (!mounted.current) return;
      if (token !== epoch.value || !allowed.current || !isFocused() || AppState.currentState !== 'active' ||
          latest.current.disabled || latest.current.loading) {
        release();
        return;
      }
      let result;
      try { result = latest.current.onPress?.(); }
      catch (_) { result = undefined; }
      Promise.resolve(result).catch(() => {}).finally(release);
    };
    // The first part of a commit handler can block the JS thread (building
    // and signing). Let the busy label paint first, then commit.
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [canAct, clearHint, dragging, epoch, isFocused, travel, x]);

  const gesture = useMemo(() => Gesture.Pan()
    .enabled(!disabled && !loading && travel > 0)
    .maxPointers(1)
    .onTouchesDown((event, manager) => {
      // maxPointers alone only fails before activation. Also cancel an active
      // slide when a second finger arrives, even past the release threshold.
      if (event.numberOfTouches > 1) {
        epoch.value += 1;
        dragging.value = false;
        x.value = withSpring(0, SPRING);
        manager.fail();
      }
    })
    .minDistance(0)
    .onBegin(event => {
      // Only the thumb starts a slide. A tap elsewhere cannot complete it.
      dragging.value = event.x <= height && event.x >= 0 && x.value < 1;
      dragEpoch.value = epoch.value;
      if (dragging.value) runOnJS(begin)(dragEpoch.value);
    })
    .onUpdate(event => {
      if (!dragging.value || dragEpoch.value !== epoch.value) return;
      x.value = Math.max(0, Math.min(travel, event.translationX));
    })
    .onEnd((_event, success) => {
      if (!dragging.value || dragEpoch.value !== epoch.value) return;
      dragging.value = false;
      // A cancelled or failed gesture (second finger, system interruption)
      // never completes, even past the threshold.
      if (success && x.value / travel >= THRESHOLD) {
        runOnJS(complete)(dragEpoch.value, x.value / travel);
      } else {
        const short = success && x.value / travel < THRESHOLD;
        x.value = withSpring(0, SPRING);
        runOnJS(incomplete)(dragEpoch.value, short);
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      x.value = withSpring(0, SPRING);
      runOnJS(incomplete)(dragEpoch.value, false);
    }), [begin, complete, disabled, dragEpoch, dragging, epoch, height, incomplete, loading, travel, x]);
  const thumbStyle = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));
  const busy = Boolean(loading || committing);
  const blocked = Boolean(disabled || busy);
  // Keep this style attached in every state. Detaching it while blocked left
  // the native opacity at 0 from the finished slide, so "Sending…" and the
  // label after a failed commit were invisible on Android.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: blocked ? 1 : 1 - Math.min(1, x.value / Math.max(1, travel) * 1.8),
  }), [blocked, travel]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{paddingVertical: touchInset, marginVertical: -touchInset}}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={actionHint}
        accessibilityState={{disabled: blocked, busy}}
        accessibilityActions={[{name: 'activate', label}]}
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'activate') complete(epoch.value);
        }}
        onAccessibilityTap={() => complete(epoch.value)}
        onLayout={event => {
          setWidth(event.nativeEvent.layout.width);
        }}
        style={[styles.track, {height, backgroundColor: theme.colors.primary,
          // Busy keeps full strength so the loading text stays readable.
          // Only an unavailable slide dims.
          borderColor: theme.colors.primary, opacity: blocked && !busy ? 0.5 : 1}]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.label,
            !blocked && {paddingLeft: height + 4, paddingRight: 8},
            labelStyle,
          ]}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={gradientButtonStyles.gradientButtonLabel}>
            {busy ? loadingText || label : hint ? actionHint : label}
          </Text>
        </Animated.View>
        {!blocked && <Animated.View pointerEvents="none" style={[styles.thumb,
          {width: thumbSize, height: thumbSize}, thumbStyle]}>
          <ArrowRight size={24} strokeWidth={1.8} color={theme.colors.primary} />
        </Animated.View>}
      </View>
      </View>
    </GestureDetector>
  );
}
