/*
  This component serves as a wrapper for native modals so that they
  exhibit expected behaviour
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  View
} from 'react-native'
import getUid from '../utils/uid'
import { PUSH_MODAL, REMOVE_MODAL } from "../utils/constants/storeType";

class Modal extends Component {
  constructor(props) {
    super(props);

    this.uid = getUid()
  }

  componentDidMount() {
    if (this.props.visible) this.pushSelf()
  }

  componentWillUnmount() {
    this.removeSelf()
  }

  componentDidUpdate(lastProps) {
    if (!lastProps.visible && this.props.visible) this.pushSelf()
    else if (lastProps.visible && !this.props.visible) this.removeSelf()
  }

  pushSelf() {
    this.props.dispatch({
      type: PUSH_MODAL,
      payload: {
        modal: this.uid
      }
    })
  }

  removeSelf() {
    this.props.dispatch({
      type: REMOVE_MODAL,
      payload: {
        modal: this.uid
      }
    })
  }

  render() {
    const {
      avoidKeyboard,
      children,
      keyboardVerticalOffset,
      ...modalProps
    } = this.props;
    // Android's native dialog already uses adjustResize. A second height
    // avoider caches a transient dialog frame and can leave actions under the
    // IME after it resizes. Keep the root flexible and let the dialog resize it.
    const KeyboardRoot = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
    const keyboardRootProps = Platform.OS === 'ios'
      ? {behavior: 'padding', keyboardVerticalOffset: keyboardVerticalOffset || 0}
      : {};
    const modalChildren = avoidKeyboard ? (
      <KeyboardRoot
        {...keyboardRootProps}
        style={{ flex: 1 }}
      >
        {children}
      </KeyboardRoot>
    ) : children;

    return (
      <NativeModal
        {...modalProps}
        visible={
          this.props.visible &&
          this.props.modalStack[this.props.modalStack.length - 1] === this.uid
        }
      >
        {modalChildren}
      </NativeModal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    modalStack: state.modal.stack
  }
};

export default connect(mapStateToProps)(Modal);
