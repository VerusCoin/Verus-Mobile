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

import React, {useContext} from 'react';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {Platform, ScrollView} from 'react-native';

import Item from './Item';
import {ConfigContext} from './ConfigContext';

const AnimatedList = ({
  children,
  editing,
  onDragEnd,
  refreshControl,
  onPressDetected,
  animate,
  minDist,
}) => {
  const config = useContext(ConfigContext);
  const {COL, HEIGHT} = config;
  const scrollY = useSharedValue(0);
  const scrollView = useAnimatedRef();
  const positions = useSharedValue(
    Object.assign(
      {},
      ...children.map((child, index) => ({[child.props.id]: index})),
    ),
  );
  const onScroll = useAnimatedScrollHandler({
    onScroll: ({contentOffset: {y}}) => {
      scrollY.value = y;
    },
  });

  return (
    <Animated.ScrollView
      refreshControl={refreshControl}
      onScroll={onScroll}
      ref={scrollView}
      contentContainerStyle={{
        height: Math.ceil(children.length / COL) * HEIGHT + 16,
        overflow: 'visible'
      }}
      style={{
        paddingTop: 10
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
      scrollEventThrottle={16}>
      {children.map(child => {
        return (
          <Item
            key={child.props.id}
            positions={positions}
            id={child.props.id}
            editing={editing}
            onDragEnd={onDragEnd}
            scrollView={scrollView}
            scrollY={scrollY}
            onPressDetected={onPressDetected}
            animate={animate}
            minDist={minDist}>
            {child}
          </Item>
        );
      })}
    </Animated.ScrollView>
  );
};

const NonAnimatedList = ({
  children,
  refreshControl,
  onPressDetected,
  animate,
}) => {
  const config = useContext(ConfigContext);
  const {WIDTH, HEIGHT, COL} = config;

  return (
    <ScrollView
      refreshControl={refreshControl}
      contentContainerStyle={{
        height: Math.ceil(children.length / COL) * HEIGHT + 16,
        overflow: 'visible',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: "space-between",
        paddingHorizontal: 6,
        paddingTop: 10
      }}>
      {children.map(child => {
        return (
          <Item
            key={child.props.id}
            id={child.props.id}
            onPressDetected={onPressDetected}
            animate={animate}
            positions={{
              value: Object.assign(
                {},
                ...children.map((child, index) => ({[child.props.id]: index})),
              ),
            }}>
            {child}
          </Item>
        );
      })}
    </ScrollView>
  );
};

const List = props => {
  return props.animate ? (
    <AnimatedList {...props} />
  ) : (
    <NonAnimatedList {...props} />
  );
};

export default List;
