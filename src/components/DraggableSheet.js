import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  View,
  Text,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {ChevronUp} from 'lucide-react-native';
import useReduceMotion from '../hooks/useReduceMotion';
import {draggableSheetStyles as styles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

// Non-modal, two-position sheet. The caller supplies coordinates inside a
// measured viewport above its own tab bar/safe footer, and owns progress.
// At peek the whole sheet drags. Open lists keep their native scrolling and
// pull-to-refresh; only the header closes the sheet.
const DraggableSheet = forwardRef(
  (
    {children, title, progress, peekTop, openTop, resetKey, onOpenChange},
    ref,
  ) => {
    const theme = useOnboardingTheme();
    const reduceMotion = useReduceMotion();
    const headerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const start = useSharedValue(0);
    const target = useSharedValue(0);
    const dragging = useSharedValue(false);
    const distance = Math.max(1, peekTop - openTop);
    const commitOpen = useCallback(
      next => {
        setOpen(next);
        onOpenChange?.(next);
      },
      [onOpenChange],
    );
    const settle = useCallback(
      (next, velocity = 0) => {
        'worklet';
        target.value = next;
        // Commit the open state only when the sheet comes to rest. On Android
        // a re-render during the move holds back the animated layout values
        // (top, height), so the sheet stood still and then jumped.
        const done = finished => {
          'worklet';
          if (finished) runOnJS(commitOpen)(next === 1);
        };
        progress.value = reduceMotion
          ? withTiming(
              next,
              {duration: 140, reduceMotion: ReduceMotion.Never},
              done,
            )
          : withSpring(
              next,
              {
                damping: 29,
                stiffness: 260,
                mass: 1,
                overshootClamping: true,
                velocity: -velocity / distance,
                restDisplacementThreshold: 0.001,
                restSpeedThreshold: 0.01,
              },
              done,
            );
      },
      [commitOpen, distance, progress, reduceMotion, target],
    );
    const reset = useCallback(() => {
      dragging.value = false;
      cancelAnimation(progress);
      target.value = 0;
      progress.value = 0;
      commitOpen(false);
    }, [commitOpen, dragging, progress, target]);
    useImperativeHandle(ref, () => ({close: () => settle(0), reset}), [
      reset,
      settle,
    ]);
    useEffect(reset, [resetKey, reset]);
    useEffect(() => {
      if (!open) return undefined;
      const frame = requestAnimationFrame(() => {
        const handle = findNodeHandle(headerRef.current);
        if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
      });
      return () => cancelAnimationFrame(frame);
    }, [open]);

    const makePan = useCallback(
      () =>
        Gesture.Pan()
          .activeOffsetY([-6, 6])
          .failOffsetX([-12, 12])
          .onStart(event => {
            // RNGH 2.25 on iOS can emit END -> BEGAN with zero pointers. Do not
            // cancel on BEGAN. Only an activated pan with a real finger can do it.
            if (event.numberOfPointers < 1) return;
            dragging.value = true;
            cancelAnimation(progress);
            start.value = progress.value;
          })
          .onUpdate(event => {
            if (!dragging.value || event.numberOfPointers < 1) return;
            progress.value = Math.max(
              0,
              Math.min(1, start.value - event.translationY / distance),
            );
          })
          .onEnd(event => {
            if (!dragging.value) return;
            dragging.value = false;
            const next =
              Math.abs(event.velocityY) >= 500
                ? event.velocityY < 0
                  ? 1
                  : 0
                : progress.value >= 0.5
                ? 1
                : 0;
            settle(next, event.velocityY);
          })
          .onFinalize(() => {
            if (!dragging.value) return;
            dragging.value = false;
            settle(target.value);
          }),
      [distance, dragging, progress, settle, start, target],
    );
    const peekPan = useMemo(() => makePan().enabled(!open), [makePan, open]);
    const headerPan = useMemo(() => makePan().enabled(open), [makePan, open]);
    const sheetStyle = useAnimatedStyle(() => ({
      top: peekTop - distance * progress.value,
    }));
    const chevronStyle = useAnimatedStyle(() => ({
      transform: [{rotate: `${progress.value * 180}deg`}],
    }));

    return (
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.sheet,
            shadowColor: theme.isDark ? '#000000' : '#080E1C',
            shadowOpacity: theme.isDark ? 0.4 : 0.14,
          },
          sheetStyle,
        ]}>
        <GestureDetector gesture={peekPan}>
          <View collapsable={false} style={styles.clip}>
            <GestureDetector gesture={headerPan}>
              <Pressable
                ref={headerRef}
                accessibilityRole="button"
                accessibilityLabel={title}
                accessibilityState={{expanded: open}}
                accessibilityHint={
                  open ? 'Closes the list.' : 'Opens the list.'
                }
                accessibilityActions={[
                  {name: 'open', label: 'Open'},
                  {name: 'close', label: 'Close'},
                ]}
                onAccessibilityAction={({nativeEvent}) => {
                  if (nativeEvent.actionName === 'open') settle(1);
                  if (nativeEvent.actionName === 'close') settle(0);
                }}
                onAccessibilityEscape={() => settle(0)}
                onPress={() => settle(target.value === 1 ? 0 : 1)}
                style={styles.header}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.handle,
                    {backgroundColor: theme.colors.border},
                  ]}
                />
                <Text
                  style={[
                    theme.typography.titleRow,
                    styles.title,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {title}
                </Text>
                <Animated.View style={[styles.chevron, chevronStyle]}>
                  <ChevronUp size={20} color={theme.colors.textSubtle} />
                </Animated.View>
              </Pressable>
            </GestureDetector>
            <View style={styles.content}>
              {typeof children === 'function' ? children({open}) : children}
            </View>
          </View>
        </GestureDetector>
      </Animated.View>
    );
  },
);

export default DraggableSheet;
