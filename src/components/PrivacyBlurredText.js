import React from 'react';
import {
  Animated,
  PixelRatio,
  requireNativeComponent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const NativePrivacyBlurredText = requireNativeComponent('PrivacyBlurredText');

const PrivacyBlurredText = ({
  blurRadius,
  children,
  color,
  containerStyle,
  hidden,
  revealProgress,
  style,
  ...textProps
}) => {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontScale = textProps.allowFontScaling === false ? 1 : PixelRatio.getFontScale();
  const baseFontSize = flattenedStyle.fontSize || 14;
  const fontSize = baseFontSize * fontScale;
  const lineHeight = (flattenedStyle.lineHeight || baseFontSize) * fontScale;
  let blurredOpacity = hidden ? 1 : 0;
  let clearOpacity = hidden ? 0 : 1;

  if (revealProgress) {
    blurredOpacity = revealProgress.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [1, 0.3, 0],
    });
    clearOpacity = revealProgress.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0, 0.08, 1],
    });
  }

  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={containerStyle}>
      <Text
        {...textProps}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[style, styles.spacer]}>
        {children}
      </Text>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {opacity: blurredOpacity}]}>
        <NativePrivacyBlurredText
          blurRadius={blurRadius}
          color={color}
          fontFamily={flattenedStyle.fontFamily}
          fontSize={fontSize}
          fontWeight={`${flattenedStyle.fontWeight || 'normal'}`}
          letterSpacing={flattenedStyle.letterSpacing || 0}
          lineHeight={lineHeight}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          text={`${children}`}
          textAlign={flattenedStyle.textAlign || 'left'}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {opacity: clearOpacity}]}>
        <Text {...textProps} style={[style, {color}]}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  spacer: {color: 'transparent'},
});

export default PrivacyBlurredText;
