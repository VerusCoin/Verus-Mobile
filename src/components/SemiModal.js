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
import {useOnboardingTheme} from '../theme/onboarding';

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
    const modalTheme = this.props.modalTheme;
    const modalColors = modalTheme ? modalTheme.colors : null;
    const sheetBackgroundColor = modalColors
      ? modalColors.sheet
      : Colors.secondaryColor;
    const sheetTextColor = modalColors ? modalColors.textPrimary : '#1A1A1A';
    const closeButtonBackgroundColor = modalColors
      ? modalColors.surfaceMuted
      : '#EEF0F3';
    const closeIconColor = modalColors ? modalColors.textPrimary : '#111';
    const effectiveOnRequestClose = closeDisabled
      ? () => {}
      : onRequestClose;

    // Header layout uses a fixed-size right action so the title stays centered.
    const closeButtonSize = 34;

    return (
      <React.Fragment>
        {this.props.visible && this.props.showOverlay !== false && (
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
          // A result may map native Back to Done while keeping outside taps locked.
          onRequestClose={this.props.onRequestBack || effectiveOnRequestClose}
          onDismiss={this.props.onDismiss}
          avoidKeyboard={this.props.avoidKeyboard}
          keyboardVerticalOffset={this.props.keyboardVerticalOffset}
        >
          <TouchableWithoutFeedback onPress={effectiveOnRequestClose}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              {
                flex: flexHeight,
                backgroundColor: sheetBackgroundColor,
                borderRadius: 10,
                paddingTop: showHeader ? 0 : 10,
              },
              this.props.contentContainerStyle,
              this.props.sheetAnimatedStyle,
            ]}
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
                        color: sheetTextColor,
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
                      backgroundColor: closeButtonBackgroundColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: closeDisabled ? 0.5 : 1,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color={closeIconColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {this.props.children}
          </Animated.View>
        </Modal>
      </React.Fragment>
    );
  }
}

const ThemedSemiModal = props => {
  const modalTheme = useOnboardingTheme();

  return <SemiModal {...props} modalTheme={props.modalTheme || modalTheme} />;
};

export default ThemedSemiModal;
