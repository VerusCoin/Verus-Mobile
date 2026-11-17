import React, {useId} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useAppTheme} from '../theme/app';

const ScrollEdgeFade = ({
  backgroundColor,
  edge = 'bottom',
  length = 36,
  style,
  visible = true,
}) => {
  const theme = useAppTheme();
  const id = useId().replace(/:/g, '');
  const isHorizontal = edge === 'left' || edge === 'right';
  const isStartEdge = edge === 'left' || edge === 'top';
  const fadeColor = backgroundColor || theme.colors.background;
  const gradientId = `scrollEdgeFade${id}`;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.fade,
        styles[edge],
        isHorizontal ? {width: length} : {height: length},
        {
          opacity: visible ? 1 : 0,
        },
        style,
      ]}>
      <Svg accessible={false} height="100%" width="100%">
        <Defs>
          <LinearGradient
            id={gradientId}
            x1="0"
            x2={isHorizontal ? '1' : '0'}
            y1="0"
            y2={isHorizontal ? '0' : '1'}>
            <Stop
              offset="0"
              stopColor={fadeColor}
              stopOpacity={isStartEdge ? 1 : 0}
            />
            <Stop offset="0.55" stopColor={fadeColor} stopOpacity={0.45} />
            <Stop
              offset="1"
              stopColor={fadeColor}
              stopOpacity={isStartEdge ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect
          fill={`url(#${gradientId})`}
          height="100%"
          width="100%"
          x="0"
          y="0"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    zIndex: 1,
  },
  top: {
    top: 0,
    right: 0,
    left: 0,
  },
  right: {
    top: 0,
    right: 0,
    bottom: 0,
  },
  bottom: {
    right: 0,
    bottom: 0,
    left: 0,
  },
  left: {
    top: 0,
    bottom: 0,
    left: 0,
  },
});

export default ScrollEdgeFade;
