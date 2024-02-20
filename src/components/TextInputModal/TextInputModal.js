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

    this.state = {
      text: props.value == null ? "" : props.value
    }
  }

  setText(text) {
    this.setState({
      text
    })
  }

  render() {
    const { visible, cancel, value, onChange, mode } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={() => cancel(this.state.text)}
        contentContainerStyle={{
          height:
            Platform.OS === "android" ? 64 : this.props.keyboardHeight + 64,
          flex: 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(text) => {
            this.setText(text)
            onChange(text)
          }}
          mode={mode}
          style={{
            backgroundColor: this.props.darkMode
                ? Colors.verusDarkModeForm
                : Colors.ultraUltraLightGrey,
            
          }}
          autoFocus
          theme={{
            colors: {
              text: this.props.darkMode
                ? Colors.secondaryColor
                : 'black',
              placeholder: this.props.darkMode
                ? Colors.verusDarkGray
                : Colors.verusDarkGray,
            },
          }}
          underlineColor={Colors.primaryColor}
          selectionColor={Colors.primaryColor}
          render={(props) => (
            <NativeTextInput
              autoCapitalize={"none"}
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={cancel != null ? () => cancel(this.state.text) : () => {}}
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
    keyboardHeight: state.keyboard.height,
    darkMode: state.settings.darkModeState,
  }
};

export default connect(mapStateToProps)(TextInputModal);
