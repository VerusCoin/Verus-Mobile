/*
  This component displays a modal with a number pad to enter number values
*/

import React, { Component } from "react";
import NumberPad, { Input, Display } from '../NumberPad/index';
import SemiModal from "../SemiModal";
import {IconButton, withTheme} from "react-native-paper"
import { triggerLightHaptic } from "../../utils/haptics/haptics";

class NumberPadModal extends Component {
  constructor(props) {
    super(props);
    this.currentValue = props.value;
  }

  render() {
    const {
      visible,
      cancel,
      value,
      onChange = () => {},
      submit,
      decimals
    } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={() => cancel(this.props.value)}
        flexHeight={3}
        contentContainerStyle={{
          maxHeight: 384,
          backgroundColor: this.props.theme.colors.surface,
        }}
      >
        <NumberPad>
          <Display
            key={0}
            cursor
            value={value}
            decimals={decimals}
            autofocus
            onChange={(number) => {
              this.currentValue = number
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
            onSubmit={submit ? () => submit(this.currentValue) : undefined}
            onWillHide={submit ? undefined : cancel}
          />
        </NumberPad>
      </SemiModal>
    );
  }
}

export default withTheme(NumberPadModal);
