/*
  This component creates a modal that covers half of 
  the screen, while darkening the content behind it
*/

import React, { Component } from "react";
import {
  View,
  Animated,
  TouchableWithoutFeedback
} from "react-native";
import Colors from "../globals/colors";
import Styles from "../styles/index";
import Modal from './Modal'
import { connect } from "react-redux";

class SemiModal extends Component {
  
  constructor(props) {
    super(props);
    this.state = {};

    this.animatedOpacity = new Animated.Value(0)
  }

  componentDidMount() {
    if (this.props.visible) this.fadeIn()
  }

  componentDidUpdate(lastProps) {
    if (lastProps.visible && !this.props.visible) this.fadeOut()
    else if (!lastProps.visible && this.props.visible) this.fadeIn()
  }

  fadeIn = () => {
    Animated.timing(this.animatedOpacity, {
      toValue: 0.6,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  fadeOut = () => {
    Animated.timing(this.animatedOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  render() {
    const flexHeight = this.props.flexHeight != null ? this.props.flexHeight : 1
    return (
      <React.Fragment>
        {this.props.visible && (
          <Animated.View
            style={{
              ...Styles.flexBackgroundDark,
              ...Styles.fullHeight,
              ...Styles.fullWidth,
              opacity: this.animatedOpacity,
            }}
          />
        )}
        <Modal
          animationType={this.props.animationType}
          transparent={true}
          visible={this.props.visible}
          onRequestClose={this.props.onRequestClose}
          onDismiss={this.props.onRequestClose}
        >
          <TouchableWithoutFeedback onPress={this.props.onRequestClose}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View
            style={{
              flex: flexHeight,
              backgroundColor: this.props.darkMode? Colors.darkModeColor:Colors.secondaryColor,
              borderRadius: 10,
              paddingTop: 10,
              ...(this.props.contentContainerStyle
                ? this.props.contentContainerStyle
                : {}),
            }}
          >
            {this.props.children}
          </View>
        </Modal>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    darkMode:state.settings.darkMode
  }
};

export default connect(mapStateToProps)(SemiModal);
