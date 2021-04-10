import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated } from 'react-native';

import NumberPadContext from './NumberPadContext';

export default class AvoidingView extends Component {
  static contextType = NumberPadContext;

  static propTypes = {
    children: PropTypes.any,
    style: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.animation = new Animated.Value(0);
  }

  show = () => {
    Animated.timing(this.animation, {
      duration: 200,
      toValue: this.context.height,
      useNativeDriver: false,
    }).start();
  };

  hide = () => {
    Animated.timing(this.animation, {
      duration: 200,
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  componentDidMount() {
    this.context.registerAvoidingView(this);
  }

  componentWillUnmount() {
    Animated.timing(this.animation, {
      duration: 200,
      toValue: 0,
      useNativeDriver: false,
    }).start();
  }

  render() {
    return (
      <Animated.View
        style={[
          {
            paddingBottom: this.animation.interpolate({
              inputRange: [0, this.context.height],
              outputRange: [0, this.context.height],
            }),
          },
          this.props.style,
        ]}
      >
        {this.props.children}
      </Animated.View>
    );
  }
}
