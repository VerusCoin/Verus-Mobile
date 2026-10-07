import React from 'react';
import { StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedSuccessCheckmark = ({ style }) => {
  const animationStyle = StyleSheet.flatten(style) || {};

  return (
    <LottieView
      source={require("../animations/success_checkmark.json")}
      autoPlay
      loop={false}
      style={{ width: 128, height: animationStyle.width ?? 128, ...animationStyle }}
    />
  );
};

export default AnimatedSuccessCheckmark;
