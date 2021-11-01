/*
  This component displays a modal with a number pad to enter number values
*/

import React, { Component } from "react";
import NumberPad, { Input, Display } from '../NumberPad/index';
import SemiModal from "../SemiModal";
import { IconButton } from "react-native-paper"
import { triggerLightHaptic } from "../../utils/haptics/haptics";

class NumberPadModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      visible,
      cancel,
      value,
      onChange,
      decimals
    } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={() => cancel(this.props.value)}
        flexHeight={3}
        contentContainerStyle={{ maxHeight: 384, backgroundColor: "#F8F8F8" }}
      >
        <NumberPad>
          <Display
            key={0}
            cursor
            value={value}
            decimals={decimals}
            autofocus
            onChange={(number) => {
              triggerLightHaptic()
              onChange(number)
            }}
          />
          <Input
            backspaceIcon={
              <IconButton icon="backspace" {...Input.iconStyle} />
            }
            hideIcon={
              <IconButton icon="check" {...Input.iconStyle} />
            }
            height={300}
            onWillHide={cancel}
          />
        </NumberPad>
      </SemiModal>
    );
  }
}

export default NumberPadModal;
