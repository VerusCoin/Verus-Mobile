import React, {useId} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

// One flat, two-stop material for cards and picker swatches in both themes.
// `height`: draw at this fixed height and let the parent clip it. Use it when
// Reanimated animates the parent's height: the SVG does not redraw on those
// frames, so a 100 % height would keep the old size.
const CardMaterial = ({colors, radius = 0, height}) => {
  const id = `card${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      accessible={false}
      pointerEvents="none"
      width="100%"
      height={height ?? '100%'}
      style={height == null ? StyleSheet.absoluteFill : [styles.fixed, {height}]}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={radius} fill={`url(#${id})`} />
    </Svg>
  );
};

const styles = StyleSheet.create({
  fixed: {position: 'absolute', top: 0, left: 0, right: 0},
});

export default CardMaterial;
