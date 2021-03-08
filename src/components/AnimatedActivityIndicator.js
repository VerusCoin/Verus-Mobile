import React from 'react';
import LottieView from 'lottie-react-native';

const AnimatedActivityIndicator = (props) => (
  <LottieView
    source={require("../animations/loading_circle.json")}
    autoPlay
    loop
    style={props.style}
  />
);

export default AnimatedActivityIndicator;
