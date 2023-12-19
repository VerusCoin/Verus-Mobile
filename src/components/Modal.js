/*
  This component serves as a wrapper for native modals so that they
  exhibit expected behaviour
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import { Modal as NativeModal } from 'react-native'
import getUid from '../utils/uid'
import { PUSH_MODAL, REMOVE_MODAL } from "../utils/constants/storeType";
import Colors from "../globals/colors";


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
    return (
      <NativeModal
        {...this.props}
        visible={
          this.props.visible &&
          this.props.modalStack[this.props.modalStack.length - 1] === this.uid
        }
        style={{backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor}}
      >
        {this.props.children}
      </NativeModal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    modalStack: state.modal.stack,
    darkMode:state.settings.darkModeState
  }
};

export default connect(mapStateToProps)(Modal);
