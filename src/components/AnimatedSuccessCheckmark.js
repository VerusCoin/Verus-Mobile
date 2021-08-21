import React from 'react';
import LottieView from 'lottie-react-native';

const AnimatedSuccessCheckmark = (props) => (
  <LottieView
    source={require("../animations/success_checkmark.json")}
    autoPlay
    loop={false}
    style={props.style}
  />
);

export default AnimatedSuccessCheckmark;
