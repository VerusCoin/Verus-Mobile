/*
  SemiModal
  - 2026-01-12: Added an optional standardized sheet header (centered title + top-right X
    in a light grey circle) to replace ad-hoc blue "Close" text buttons across sheets.
    Header is opt-in via `title`/`showHeader` to avoid breaking existing custom layouts.
*/

import React, { Component } from "react";
import {
  View,
  Text,
  Animated,
  TouchableWithoutFeedback,
  TouchableOpacity
} from "react-native";
import Colors from "../globals/colors";
import Styles from "../styles/index";
import Modal from './Modal'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
    const showHeader = this.props.showHeader != null
      ? this.props.showHeader
      : this.props.title != null;

    const closeDisabled = !!this.props.closeDisabled;
    const onRequestClose = this.props.onRequestClose;
    const effectiveOnRequestClose = closeDisabled
      ? () => {}
      : onRequestClose;

    // Header layout uses a fixed-size right action so the title stays centered.
    const closeButtonSize = 34;

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
          onRequestClose={effectiveOnRequestClose}
          onDismiss={effectiveOnRequestClose}
        >
          <TouchableWithoutFeedback onPress={effectiveOnRequestClose}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View
            style={{
              flex: flexHeight,
              backgroundColor: Colors.secondaryColor,
              borderRadius: 10,
              paddingTop: showHeader ? 0 : 10,
              ...(this.props.contentContainerStyle
                ? this.props.contentContainerStyle
                : {}),
            }}
          >
            {showHeader && (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingTop: 12,
                  paddingBottom: 12,
                }}
              >
                {/* Centered title (absolute) */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {typeof this.props.title === 'string' ? (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#1A1A1A',
                      }}
                      numberOfLines={1}
                    >
                      {this.props.title}
                    </Text>
                  ) : (
                    this.props.title
                  )}
                </View>

                {/* Left + Right actions */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ minWidth: closeButtonSize, minHeight: closeButtonSize }}>
                    {this.props.headerLeft != null ? this.props.headerLeft : null}
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={this.props.closeAccessibilityLabel || 'Close'}
                    onPress={closeDisabled ? undefined : onRequestClose}
                    activeOpacity={0.7}
                    disabled={closeDisabled}
                    style={{
                      width: closeButtonSize,
                      height: closeButtonSize,
                      borderRadius: closeButtonSize / 2,
                      backgroundColor: '#EEF0F3',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: closeDisabled ? 0.5 : 1,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color="#111"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {this.props.children}
          </View>
        </Modal>
      </React.Fragment>
    );
  }
}

export default SemiModal;
