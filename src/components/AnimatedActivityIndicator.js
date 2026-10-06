import React from 'react';
import { StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedActivityIndicator = ({ style }) => {
  const animationStyle = StyleSheet.flatten(style) || {};

  return (
    <LottieView
      source={require("../animations/loading_circle.json")}
      autoPlay
      loop
      style={{ width: 128, height: animationStyle.width ?? 128, ...animationStyle }}
    />
  );
};

export default AnimatedActivityIndicator;
