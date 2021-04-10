/*
  This component displays a modal with a text input to enter number values
*/

import React, { Component } from "react";
import SemiModal from "../SemiModal";
import { TextInput } from "react-native-paper"
import Colors from "../../globals/colors";
import { connect } from 'react-redux';
import { Platform, TextInput as NativeTextInput } from 'react-native'

class TextInputModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { visible, cancel, value, onChange, mode } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
        contentContainerStyle={{
          height:
            Platform.OS === "android" ? 64 : this.props.keyboardHeight + 64,
          flex: 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          mode={mode}
          style={{
            marginTop: -10,
          }}
          autoFocus
          underlineColor={Colors.primaryColor}
          selectionColor={Colors.primaryColor}
          render={(props) => (
            <NativeTextInput
              autoCapitalize={"none"}
              autoCorrect={false}
              autoComplete="false"
              {...props}
            />
          )}
        />
      </SemiModal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    keyboardHeight: state.keyboard.height
  }
};

export default connect(mapStateToProps)(TextInputModal);
