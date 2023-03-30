// React Native Drag and Sort

// MIT License

// Copyright (c) 2020 Micael

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import React, { useContext } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  scrollTo,
  withTiming,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler
} from 'react-native-gesture-handler';

import { ConfigContext, animationConfig } from './ConfigContext';
import { isConfigured } from 'react-native-reanimated/lib/reanimated2/core';
import { triggerLightHaptic } from '../../utils/haptics/haptics';

const NonAnimatedItem = ({
  children,
  id
}) => {
  const config = useContext(ConfigContext);
  const { WIDTH, HEIGHT, COL, getOrder, getPosition } = config;

  const style = StyleSheet.create({
    width: WIDTH,
    height: HEIGHT
  });

  return (
    <View style={style}>
      {children}
    </View>
  );
};

const AnimatedItem = ({
  children,
  positions,
  id,
  onDragEnd,
  scrollView,
  scrollY,
  editing,
  onPressDetected
}) => {
  const config = useContext(ConfigContext);
  const { WIDTH, HEIGHT, COL, getOrder, getPosition } = config;
  const containerHeight = Dimensions.get('window').height - 40;
  const contentHeight = (Object.keys(positions.value).length / COL) * HEIGHT;
  const isGestureActive = useSharedValue(false);

  const isHapticPrimed = useSharedValue(false)

  if (positions.value[id] == null) throw new Error("Cannot get value ID of null position")

  const position = getPosition(config, positions.value[id]);
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);

  const lastScrollY = useSharedValue(scrollY.value)

  useAnimatedReaction(
    () => positions.value[id],
    (newOrder) => {
      if (!isGestureActive.value) {
        const pos = getPosition(config, newOrder);
        translateX.value = withTiming(pos.x, animationConfig);
        translateY.value = withTiming(pos.y, animationConfig);
      }
    }
  );

  const onGestureEvent = useAnimatedGestureHandler({
    onFail: (_, ctx) => {
      if (editing) {
        if (scrollY.value === lastScrollY.value) runOnJS(onPressDetected)(id);
        
        lastScrollY.value = scrollY.value

        isHapticPrimed.value = false
      }
    },
    onStart: (_, ctx) => {
      // dont allow drag start if we're done editing
      if (editing) {
        ctx.x = translateX.value;
        ctx.y = translateY.value;

        lastScrollY.value = scrollY.value

        isHapticPrimed.value = true
      }
    },
    onActive: ({ translationX, translationY }, ctx) => {
      // dont allow drag if we're done editing
      if (editing) {
        if (isHapticPrimed.value === true) {
          isHapticPrimed.value = false
          runOnJS(triggerLightHaptic)();
        }
        
        isGestureActive.value = true;
        
        translateX.value = ctx.x + translationX;
        translateY.value = ctx.y + translationY;
        // 1. We calculate where the tile should be
        const newOrder = getOrder(
          config,
          translateX.value,
          translateY.value,
          Object.keys(positions.value).length - 1
        );

        // 2. We swap the positions
        const oldOlder = positions.value[id];
        if (newOrder !== oldOlder) {
          const idToSwap = Object.keys(positions.value).find(
            (key) => positions.value[key] === newOrder
          );
          if (idToSwap) {
            // Spread operator is not supported in worklets
            // And Object.assign doesn't seem to be working on alpha.6
            const newPositions = JSON.parse(JSON.stringify(positions.value));
            newPositions[id] = newOrder;
            newPositions[idToSwap] = oldOlder;
            positions.value = newPositions;
          }
        }

        // 3. Scroll up and down if necessary
        const lowerBound = scrollY.value;
        const upperBound = lowerBound + containerHeight - HEIGHT;
        const maxScroll = contentHeight - containerHeight;
        const leftToScrollDown = maxScroll - scrollY.value;
        if (translateY.value < lowerBound) {
          const diff = Math.min(lowerBound - translateY.value, lowerBound);
          scrollY.value -= diff;
          scrollTo(scrollView, 0, scrollY.value, false);
          ctx.y -= diff;
          translateY.value = ctx.y + translationY;
        }
        if (translateY.value > upperBound) {
          const diff = Math.min(
            translateY.value - upperBound,
            leftToScrollDown
          );
          scrollY.value += diff;
          scrollTo(scrollView, 0, scrollY.value, false);
          ctx.y += diff;
          translateY.value = ctx.y + translationY;
        }
      }
    },
    onEnd: () => {
      const newPosition = getPosition(config, positions.value[id]);
      translateX.value = withTiming(newPosition.x, animationConfig, () => {
        isGestureActive.value = false;
        runOnJS(onDragEnd)(positions.value);
      });
      translateY.value = withTiming(newPosition.y, animationConfig);
    },
  });

  const style = useAnimatedStyle(() => {
    const zIndex = isGestureActive.value ? 100 : 0;
    const scale = withSpring(isGestureActive.value ? 1.05 : 1);
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: WIDTH,
      height: HEIGHT,
      zIndex,
      overflow: "visible",
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale },
      ],
    };
  });
  
  return (
    <Animated.View style={style}>
      <PanGestureHandler enabled={editing} onGestureEvent={onGestureEvent} minDist={60}>
        <Animated.View style={StyleSheet.absoluteFill}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};

const Item = isConfigured(false) ? AnimatedItem : NonAnimatedItem

export default Item;
