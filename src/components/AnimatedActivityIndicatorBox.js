import React, { Component } from "react";
import { View } from 'react-native'
import styles from "../styles";
import AnimatedActivityIndicator from "./AnimatedActivityIndicator";

class AnimatedActivityIndicatorBox extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <View style={styles.focalCenter}>
        <AnimatedActivityIndicator
          style={{
            width: 128,
          }}
        />
      </View>
    );
  }
}

export default AnimatedActivityIndicatorBox;
